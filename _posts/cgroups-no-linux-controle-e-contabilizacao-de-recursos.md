--- title: "Cgroups no Linux: controle e contabilização de recursos" date: 2026-11-20 description: "Os *control groups*, ou cgroups, são um mecanismo do kernel Linux para organizar processos e controlar ou contabilizar o uso de recursos. Eles permitem, por exemplo, limitar a memó" tags:   - "linux"
  - "kernel"
  - "procfs"
  - "administração de sistemas" ---  # Cgroups no Linux: controle e contabilização de recursos

Os *control groups*, ou cgroups, são um mecanismo do kernel Linux para organizar processos e controlar ou contabilizar o uso de recursos. Eles permitem, por exemplo, limitar a memória de um serviço, acompanhar seu consumo de CPU ou impedir que um grupo crie processos em excesso.

Cgroups são usados por ferramentas como systemd e runtimes de contêineres. Não são, por si só, um sistema de virtualização: os processos continuam compartilhando o mesmo kernel. O mecanismo atua sobre grupos de processos e seus recursos, enquanto outros recursos de isolamento são tratados por mecanismos como namespaces.

## Como os cgroups funcionam

O kernel associa processos a grupos em uma hierarquia. Cada grupo pode receber configurações e métricas para recursos específicos, como CPU, memória, entrada e saída de dispositivos de bloco e quantidade de processos. Os componentes do kernel que implementam essas funções são chamados de controladores.

Quando um processo cria outro processo, o filho normalmente herda o cgroup do pai. Ferramentas administrativas podem mover processos entre grupos, desde que tenham as permissões necessárias. A aplicação das regras ocorre no kernel, que considera o grupo ao contabilizar o consumo ou decidir se uma operação deve ser permitida, limitada ou adiada.

A estrutura hierárquica permite agrupar serviços e criar subgrupos. Em geral, processos em um grupo e seus descendentes são considerados juntos para aplicar limites. Um limite em um grupo pai também pode restringir seus subgrupos; estes não conseguem obter mais recursos do que o permitido acima deles.

O cgroup registra ou restringe recursos, mas não substitui as demais ferramentas de diagnóstico. Um limite de CPU, por exemplo, não explica sozinho por que uma aplicação está lenta. Para investigar, é necessário combinar as métricas do cgroup com informações do sistema e da própria aplicação.

## cgroups v1 e v2

Há duas versões principais. No cgroups v1, diferentes controladores podem usar hierarquias separadas. Isso dá flexibilidade, mas torna a configuração e a interpretação do sistema mais complexas.

O cgroups v2, também chamado de hierarquia unificada, organiza os controladores sob uma hierarquia comum e oferece uma interface mais consistente. É a versão padrão em muitas distribuições atuais, mas a disponibilidade depende do kernel, da distribuição e da configuração de inicialização. Alguns sistemas ainda usam v1 ou uma configuração híbrida.

Para verificar o tipo de sistema de arquivos montado:

```bash
mount | grep cgroup
```

Em um sistema v2, é comum encontrar uma montagem chamada `cgroup2` em `/sys/fs/cgroup`. A presença e o conteúdo dos arquivos dependem dos controladores habilitados e dos grupos existentes. Evite presumir que um caminho ou controlador estará disponível em toda distribuição.

## Inspecionando os grupos

No cgroups v2, os grupos aparecem como diretórios em `/sys/fs/cgroup`. Os arquivos nesses diretórios representam configurações ou contadores mantidos pelo kernel. Em geral, é mais seguro começar lendo essas interfaces do que alterá-las diretamente.

```bash
find /sys/fs/cgroup -maxdepth 2 -type d
```

Para observar os processos associados ao grupo raiz:

```bash
cat /sys/fs/cgroup/cgroup.procs
```

O arquivo `cgroup.procs` lista IDs de processos no grupo. Já `cgroup.controllers` mostra controladores disponíveis para ativação naquele nível, e `cgroup.subtree_control` indica quais estão habilitados para os subgrupos.

Para examinar os controladores e contadores de memória, quando disponíveis:

```bash
cat /sys/fs/cgroup/cgroup.controllers
cat /sys/fs/cgroup/memory.current
cat /sys/fs/cgroup/memory.events
```

`memory.current` informa o uso atual de memória do grupo e seus descendentes conforme a contabilização do controlador. `memory.events` reúne contadores de eventos relacionados a limites, como situações em que a pressão de memória levou a uma ação do kernel. Os nomes e arquivos disponíveis variam com a versão do kernel e com os controladores habilitados.

## CPU: limite, peso e contabilização

No cgroups v2, o controlador de CPU oferece arquivos como `cpu.max` e `cpu.weight`. O primeiro define uma cota de tempo de CPU por período; o segundo influencia a distribuição relativa da CPU entre grupos em disputa.

Suponha um grupo com um período de 100 mil microssegundos e uma cota de 50 mil. Se esse limite estiver configurado, o grupo poderá usar até o equivalente a metade de uma CPU nesse período, mesmo que existam vários processadores livres. Um exemplo de leitura seria:

```bash
cat /sys/fs/cgroup/cpu.max
```

A saída pode ser semelhante a `50000 100000`. O primeiro valor é a cota; o segundo, o período, ambos em microssegundos. O valor `max` no lugar da cota indica que não há limite de quota configurado naquele grupo.

Um peso menor não fixa uma porcentagem de CPU. Ele altera a participação relativa quando há concorrência entre grupos, e o resultado depende da carga dos demais. Para investigar o consumo, consulte também `cpu.stat`, que apresenta contadores de uso e de períodos em que houve limitação, se o controlador estiver ativo:

```bash
cat /sys/fs/cgroup/cpu.stat
```

## Memória: limites e pressão

No cgroups v2, `memory.max` define um teto de memória para o grupo. `memory.high` pode indicar um nível acima do qual o kernel passa a exercer pressão para reduzir o consumo, sem ter o mesmo papel de limite rígido. `memory.current` mostra o consumo atual.

A disponibilidade desses arquivos depende do controlador. Em um ambiente de testes com um cgroup próprio, a leitura pode ser feita assim:

```bash
cat /sys/fs/cgroup/memory.current
cat /sys/fs/cgroup/memory.high
cat /sys/fs/cgroup/memory.max
```

Atingir `memory.max` pode levar o kernel a tentar recuperar memória e, se isso não for suficiente, encerrar processos do grupo por meio do mecanismo OOM associado ao cgroup. Portanto, um limite muito baixo pode causar falhas no serviço. Ao analisar o problema, examine `memory.events`, logs do sistema e a configuração do grupo.

## Administrando com systemd

Em máquinas que usam systemd, normalmente é melhor configurar limites por meio das unidades do que editar diretamente os arquivos do cgroup. O systemd cria e administra grupos para serviços e escopos, aplicando propriedades compatíveis com os controladores disponíveis.

Para consultar propriedades de um serviço:

```bash
systemctl show nginx.service -p ControlGroup -p MemoryCurrent -p MemoryMax
```

Para configurar um teto de memória persistente em uma unidade, crie um *drop-in*:

```bash
sudo systemctl edit nginx.service
```

No editor, adicione:

```ini
[Service]
MemoryMax=512M
```

Depois, aplique a alteração e reinicie o serviço:

```bash
sudo systemctl daemon-reload
sudo systemctl restart nginx.service
```

O nome da unidade, os valores adequados e as propriedades suportadas devem ser verificados para a distribuição e para a versão do systemd em uso. Reiniciar um serviço pode interromper conexões; planeje a mudança de acordo com a criticidade da aplicação. Para consultar o cgroup atribuído:

```bash
systemctl show nginx.service -p ControlGroup
```

## Boas práticas e cuidados

Defina limites com base em observações da carga real. Um teto de memória muito apertado pode transformar picos normais em encerramentos de processos; um limite de CPU excessivamente baixo pode aumentar a latência. Monitore os contadores após aplicar mudanças e ajuste gradualmente.

Prefira administrar serviços pelo systemd ou pela ferramenta que criou o grupo. Alterar arquivos em `/sys/fs/cgroup` manualmente pode conflitar com o gerenciador, e as alterações diretas geralmente não sobrevivem à recriação do grupo ou à reinicialização. Evite também mover processos de serviços gerenciados sem entender como o gerenciador acompanha seus processos.

Em contêineres, verifique a configuração no host e dentro do ambiente. A visibilidade de arquivos e métricas pode variar conforme a versão de cgroups usada, as permissões e a forma como o contêiner foi iniciado. Não presuma que um processo consiga alterar limites só porque consegue ler os contadores.

Por fim, cgroups controlam grupos, mas não são uma barreira completa de segurança. Combine-os com permissões, namespaces e outras medidas apropriadas ao ambiente. Entender a hierarquia, os controladores ativos e a ferramenta responsável pelos grupos ajuda a diagnosticar consumo excessivo e a aplicar limites sem surpreender os serviços. 