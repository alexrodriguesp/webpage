---
layout: post
title: "O escalonador de tarefas do Linux: como o kernel distribui tempo de CPU"
date: 2026-11-20 12:00:00 -0300
description: "O escalonador de tarefas do Linux decide qual tarefa executável deve usar cada processador e por quanto tempo. Uma tarefa pode ser uma thread ou um processo com apenas uma thread; "
tags:
  - "linux"
  - "kernel"
  - "procfs"
  - "administração de sistemas"
---

# O escalonador de tarefas do Linux: como o kernel distribui tempo de CPU

O escalonador de tarefas do Linux decide qual tarefa executável deve usar cada processador e por quanto tempo. Uma tarefa pode ser uma thread ou um processo com apenas uma thread; para o escalonador, ambos são unidades de execução. Quando várias tarefas disputam CPU, o kernel alterna entre elas para manter o sistema responsivo e distribuir o tempo de processamento.

O escalonador não controla sozinho o desempenho de uma aplicação. A quantidade de CPUs disponíveis, a carga de trabalho, as afinidades, as prioridades e os limites impostos por cgroups também influenciam o tempo de CPU recebido. Entender esses fatores ajuda a interpretar métricas e a diagnosticar lentidão sem atribuí-la automaticamente ao escalonador.

## Da tarefa executável à CPU

O kernel mantém estruturas de escalonamento para cada CPU. Nelas, acompanha tarefas prontas para executar, tarefas em execução e informações usadas para escolher a próxima tarefa. Uma tarefa bloqueada, por exemplo, esperando dados de um arquivo, não disputa CPU enquanto aguarda. Quando o evento esperado ocorre, ela pode voltar a ficar executável.

O escalonador é acionado em situações como a interrupção do tempo de execução de uma tarefa, a chegada de uma tarefa de prioridade maior ou o desbloqueio de uma tarefa. A troca de contexto salva o estado necessário da tarefa atual e restaura o estado da próxima. Essa operação tem custo: por isso, alternar tarefas com frequência excessiva pode consumir tempo que não executa trabalho útil.

Em sistemas com várias CPUs, o kernel também distribui tarefas entre elas. A migração pode ajudar a equilibrar a carga, mas nem sempre é desejável: mover uma tarefa pode reduzir o aproveitamento de dados que estavam na cache da CPU anterior. O escalonador considera fatores de balanceamento e afinidade para tomar essas decisões.

## Classes de escalonamento

O Linux oferece classes de escalonamento com regras diferentes. A classe normal é usada pela maioria dos processos comuns. Tarefas dessa classe são atendidas pelo escalonador justo do kernel, que busca repartir a CPU de forma proporcional entre as tarefas concorrentes, levando em conta seus pesos. Os detalhes internos e a implementação evoluem entre versões do kernel.

O valor chamado *nice* influencia esse peso. Em geral, um valor maior reduz a prioridade relativa de uma tarefa normal, enquanto um valor menor a aumenta. Isso não reserva uma porcentagem fixa de CPU: o efeito depende das demais tarefas concorrentes e da carga disponível.

Também existem políticas de tempo real, como `SCHED_FIFO` e `SCHED_RR`, e a política `SCHED_BATCH`, voltada a cargas em lote. Tarefas de tempo real podem preemptar tarefas normais, conforme as regras da política e as prioridades configuradas. Uma tarefa de tempo real mal configurada pode monopolizar a CPU e prejudicar serviços essenciais. Por isso, essas políticas exigem planejamento e privilégios adequados.

A política `SCHED_IDLE` dá prioridade muito baixa à tarefa quando há concorrência. Ela não deve ser confundida com a classe normal executada enquanto o sistema está ocioso: seu uso tem comportamento próprio e é destinado a trabalho que pode esperar.

## Observando a carga de CPU

O comando `uptime` mostra o tempo desde a inicialização e as médias de carga:

```bash
uptime
```

As médias representam a quantidade média de tarefas executáveis ou em espera ininterruptível ao longo de períodos recentes. Não são porcentagens de CPU. Em uma máquina com vários processadores, uma média de carga de 4 pode significar algo diferente em um sistema com duas CPUs e em outro com dezesseis.

Para ver a utilização por CPU e os processos em execução, use:

```bash
top
```

Em muitas distribuições, `htop` oferece uma interface interativa alternativa. A coluna `%CPU` costuma representar o uso observado durante um intervalo de amostragem; os detalhes de apresentação dependem da ferramenta e de sua configuração. Uma leitura isolada pode esconder picos curtos, então compare amostras ao investigar problemas.

O `vmstat` mostra, entre outros dados, processos executáveis e bloqueados:

```bash
vmstat 1
```

Na saída, a coluna `r` indica tarefas prontas para executar, e `b` indica tarefas bloqueadas, normalmente aguardando operações que não podem ser concluídas de imediato. A primeira linha pode resumir médias desde a inicialização; interprete principalmente as linhas seguintes, correspondentes aos intervalos observados. Muitas tarefas em `r` junto de CPUs ocupadas podem indicar disputa por processamento. Já tarefas bloqueadas podem apontar para espera de disco ou outro recurso, e não necessariamente para falta de CPU.

Para consultar informações gerais do processador:

```bash
nproc
lscpu
```

`nproc` informa quantas unidades de processamento estão disponíveis para o processo conforme o ambiente e as restrições aplicáveis. `lscpu` apresenta informações da arquitetura e da topologia reconhecidas pelo sistema. Em máquinas virtuais e contêineres, esses resultados podem refletir uma visão limitada ou virtualizada.

## Prioridade e política de uma tarefa

`nice` inicia um programa com um valor de *nice* definido:

```bash
nice -n 10 comando
```

O comando começa com prioridade relativa menor que a padrão para tarefas normais. Usuários sem privilégios geralmente podem aumentar o valor de *nice* de seus processos; reduzir o valor, o que aumenta a prioridade relativa, normalmente exige permissões adicionais.

Para alterar o valor de uma tarefa existente, use `renice`:

```bash
renice 10 -p 1234
```

Substitua `1234` pelo PID correto. Antes de alterar a prioridade, confirme o processo e o usuário responsável:

```bash
ps -p 1234 -o pid,ppid,user,ni,stat,comm
```

A coluna `ni` mostra o valor de *nice*. Uma prioridade maior não acelera automaticamente uma tarefa: ela só muda sua participação relativa quando há disputa com outras tarefas da mesma classe. Se a CPU estiver ociosa, uma tarefa comum pode executar sem que seja necessário aumentar sua prioridade.

Para consultar a política e a prioridade de escalonamento de um processo, o utilitário `chrt`, incluído em muitas distribuições no pacote `util-linux`, pode ser útil:

```bash
chrt -p 1234
```

O resultado mostra a política e a prioridade de escalonamento associadas à tarefa. Em geral, a prioridade numérica de tempo real e o valor de *nice* pertencem a mecanismos distintos; não compare os números como se estivessem na mesma escala.

## Afinidade de CPU

A afinidade determina em quais CPUs uma tarefa pode executar. Restringi-la pode ser útil em experimentos ou em cargas especializadas, mas também pode impedir o kernel de distribuir a tarefa para CPUs menos ocupadas.

Para consultar a afinidade de um processo:

```bash
taskset -pc 1234
```

Para iniciar um programa limitado a determinadas CPUs, por exemplo às CPUs 0 e 1:

```bash
taskset -c 0,1 comando
```

A numeração depende das CPUs que o sistema disponibiliza ao processo. Uma afinidade definida não garante que a tarefa vá executar imediatamente nem que receba mais CPU; apenas restringe onde ela pode ser escalonada. Antes de aplicar uma máscara em produção, confira a topologia e as CPUs permitidas no ambiente.

## O que observar em cgroups

Em muitos sistemas, serviços são executados sob cgroups administrados pelo systemd ou por um runtime de contêiner. O grupo pode impor uma cota de CPU, limitando o tempo de processamento disponível, ou um peso relativo, que influencia a distribuição durante a disputa.

Para descobrir o grupo de um serviço e consultar propriedades de CPU pelo systemd:

```bash
systemctl show nginx.service -p ControlGroup -p CPUQuotaPerSecUSec -p CPUWeight
```

A disponibilidade e os nomes das propriedades dependem da versão do systemd. Um serviço pode parecer lento embora a máquina não esteja totalmente ocupada se seu grupo tiver uma cota apertada. Para avaliar o caso, combine essas informações com as métricas do processo e do sistema.

## Boas práticas administrativas

Comece medindo a carga por um intervalo representativo. Compare utilização de CPU, número de tarefas executáveis, espera de entrada e saída, uso por processo e limites do cgroup. Uma máquina pode apresentar carga alta por tarefas bloqueadas, enquanto uma CPU aparentemente ocupada pode estar executando trabalho esperado.

Faça mudanças graduais e registre o valor anterior. Ajustar *nice*, política ou afinidade pode ajudar em casos específicos, mas também pode atrasar tarefas importantes ou concentrar trabalho em poucos processadores. Evite configurar políticas de tempo real sem conhecer os limites, as permissões e os mecanismos de recuperação disponíveis na distribuição.

Ao usar comandos direcionados a um PID, confirme que ele ainda corresponde ao processo esperado. PIDs podem ser reutilizados após o encerramento de uma tarefa. Em serviços, prefira configurar limites e prioridades pelo gerenciador responsável, como systemd, em vez de fazer ajustes manuais que podem desaparecer quando o processo for recriado.

O escalonador distribui oportunidades de execução; ele não explica, sozinho, todo problema de desempenho. Interpretar suas métricas junto com afinidade, política, cgroups e espera por outros recursos oferece um diagnóstico mais confiável e ajuda a aplicar mudanças proporcionais à causa observada.
