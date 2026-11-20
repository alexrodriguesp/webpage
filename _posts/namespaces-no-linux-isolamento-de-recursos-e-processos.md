---
title: "Namespaces no Linux: isolamento de recursos e processos"
date: 2026-11-20
description: "---"
tags:
  - "linux"
  - "kernel"
  - "procfs"
  - "administração de sistemas"
---

---
title: "Namespaces no Linux: isolamento de recursos e processos"
date: 2026-11-20
description: "Entenda como os namespaces do Linux isolam processos, quais recursos abrangem e como inspecioná-los e usá-los com segurança."
tags:
  - "linux"
  - "kernel"
  - "namespaces"
  - "contêineres"
---

# Namespaces no Linux: isolamento de recursos e processos

Namespaces são um mecanismo do kernel Linux que permite apresentar recursos do sistema de maneiras diferentes para grupos de processos. Um processo dentro de um namespace pode, por exemplo, enxergar uma lista de processos distinta, usar uma pilha de rede própria ou ter uma visão separada dos pontos de montagem. Esse mecanismo é uma das bases dos contêineres, mas não cria uma máquina virtual nem fornece, sozinho, todos os controles de segurança e limites de recursos associados a eles.

Cada processo pertence a um conjunto de namespaces. Quando um processo cria outro, o filho normalmente herda essas associações. A chamada de sistema `unshare()` pode separar o processo chamador em novos namespaces; `clone()` permite criar um processo já associado a namespaces novos; e `setns()` permite que um processo entre em um namespace existente, desde que as permissões e condições necessárias sejam atendidas. Ferramentas como `unshare` e `nsenter` tornam essas operações acessíveis pela linha de comando.

## O que é isolado

O Linux oferece diferentes tipos de namespace, cada um associado a uma classe de recursos:

- **Mount (`mnt`)**: isola a visão dos pontos de montagem. Um processo pode enxergar uma árvore de diretórios diferente.
- **Process ID (`pid`)**: apresenta uma hierarquia de processos separada. Um processo pode ter PID diferente dentro e fora do namespace.
- **Network (`net`)**: isola interfaces de rede, rotas, sockets e outras estruturas de rede.
- **User (`user`)**: separa identificadores de usuário e grupo. Um processo pode ter UID 0 dentro do namespace sem ser o usuário root no sistema hospedeiro.
- **UTS (`uts`)**: isola o nome do host e o nome de domínio NIS.
- **IPC (`ipc`)**: isola recursos de comunicação entre processos, como filas de mensagens e segmentos de memória compartilhada.
- **Cgroup (`cgroup`)**: isola a visão da hierarquia de cgroups apresentada ao processo.
- **Time (`time`)**: permite visões distintas de determinados relógios do sistema, como os usados para medir tempo de inicialização e suspensão.

A disponibilidade e o comportamento podem depender da versão do kernel e da configuração do sistema. Além disso, isolar uma classe de recursos não isola automaticamente as demais. Um processo pode estar em um namespace de rede próprio, por exemplo, e ainda compartilhar outros recursos com o hospedeiro.

## Inspecionar namespaces

O diretório `/proc` oferece links para os namespaces associados a cada processo. O comando abaixo mostra os namespaces do shell atual:

```bash
ls -l /proc/self/ns
```

As entradas aparecem como links simbólicos com identificadores entre colchetes, por exemplo:

```text
net -> net:[4026531840]
pid -> pid:[4026531836]
```

Dois processos que exibem o mesmo identificador para um tipo de namespace compartilham aquele namespace. Para consultar outro processo, substitua `1234` pelo PID desejado:

```bash
ls -l /proc/1234/ns
```

A ferramenta `lsns`, disponível em diversas distribuições no pacote `util-linux`, apresenta uma visão resumida:

```bash
lsns
lsns -p 1234
```

Também é possível usar `readlink` para consultar um namespace específico:

```bash
readlink /proc/self/ns/net
readlink /proc/1/ns/mnt
```

Acesso a informações de outros processos pode ser restringido por permissões, opções de montagem de `/proc` e controles de segurança. Além disso, PIDs podem ser reutilizados depois que um processo termina. Ao investigar um serviço, confirme que o PID ainda pertence ao processo esperado.

## Criar um namespace de montagem temporário

O comando `unshare` pode iniciar um programa em namespaces novos. Para criar um namespace de montagem e abrir um shell:

```bash
unshare --mount --fork /bin/bash
```

A opção `--fork` inicia o programa filho no novo contexto. Dentro do shell, é possível verificar o identificador do namespace:

```bash
readlink /proc/self/ns/mnt
```

Uma alteração de montagem feita dentro desse namespace pode ter uma visão própria, mas o comportamento de propagação das montagens também importa. Em muitas configurações, montagens são compartilhadas entre grupos de montagem. Para reduzir o risco de propagar mudanças, é comum tornar a árvore privada dentro do namespace:

```bash
mount --make-rprivate /
```

Esse comando afeta a propagação de montagens na árvore visível ao processo. Use-o apenas em um ambiente de teste e entenda a topologia de montagem antes de aplicar em sistemas de produção. Ao sair do shell, o namespace temporário deixa de ser mantido quando não há processos que o utilizem.

A criação de namespaces de usuário pode permitir operações administrativas dentro de um ambiente isolado sem conceder privilégios equivalentes no hospedeiro. O suporte a namespaces de usuário sem privilégios varia conforme a configuração e a distribuição. Por isso, um comando como o seguinte pode funcionar em alguns sistemas e ser negado em outros:

```bash
unshare --user --map-root-user --mount --fork /bin/bash
```

`--map-root-user` mapeia o usuário que executa o comando para UID 0 dentro do novo namespace de usuário. Isso não transforma esse usuário em root no sistema hospedeiro. Ainda assim, namespaces de usuário ampliam a complexidade da superfície de ataque; administradores devem acompanhar as configurações e atualizações de segurança da distribuição.

## Entrar nos namespaces de um processo

`nsenter` inicia um programa dentro de um ou mais namespaces já existentes. Por exemplo, para abrir um shell nos namespaces de montagem, PID e rede de um processo:

```bash
sudo nsenter --target 1234 --mount --pid --net /bin/bash
```

O comando exige as permissões apropriadas e não converte automaticamente a visão de todos os recursos. Se também for necessário usar o namespace de usuário do alvo, essa opção deve ser solicitada explicitamente e pode exigir cuidados adicionais com mapeamentos de UID e GID.

Ao entrar em um namespace de PID, o comportamento de processos descendentes é relevante: a associação ao namespace de PID é definida na criação do processo. Por isso, algumas ferramentas usam a opção `--fork` para iniciar um filho dentro da visão desejada. Para inspecionar namespaces sem abrir um shell interativo, prefira comandos direcionados e de curta duração.

## Relação com contêineres

Contêineres combinam namespaces com outros recursos do kernel. Cgroups controlam ou contabilizam o uso de CPU, memória e outros recursos; capacidades limitam operações privilegiadas; e mecanismos como seccomp e LSMs podem restringir chamadas de sistema e acessos. Sistemas de contêiner também configuram sistemas de arquivos, dispositivos, redes e políticas de execução.

Portanto, namespaces fornecem isolamento de visibilidade, mas não devem ser tratados como uma fronteira de segurança completa por si só. Um processo isolado em namespaces ainda pode causar impacto no hospedeiro se receber privilégios excessivos, acesso a dispositivos, diretórios compartilhados ou capacidades perigosas. A segurança depende da combinação correta de controles e da configuração do runtime.

## Boas práticas administrativas

Ao diagnosticar um contêiner ou serviço, compare os namespaces do processo com os do PID 1 e com os de outros processos relevantes. Use `lsns` e `/proc/<pid>/ns` para identificar o que está compartilhado, sem presumir que um nome de contêiner corresponde a um único conjunto fixo de namespaces.

Em testes, execute `unshare` com um comando explícito e limite o escopo das alterações. Evite experimentar comandos de montagem, rede ou IPC em shells administrativos sem entender em qual namespace eles serão aplicados. Verifique o contexto antes de alterar configurações:

```bash
readlink /proc/self/ns/mnt
readlink /proc/self/ns/net
id
```

Para scripts de administração, valide o PID de destino, trate falhas de permissão e registre quais namespaces serão usados. Não use `nsenter` como atalho para contornar controles de acesso. Em ambientes de produção, prefira os recursos documentados do runtime de contêineres e mantenha suas configurações sob controle de versão.

Namespaces ajudam a construir ambientes isolados e a compreender como processos enxergam o sistema. Inspecioná-los é útil para depuração e administração, mas alterações devem ser feitas com cautela: o contexto do processo determina o alcance de cada comando, e a proteção efetiva depende também de permissões, cgroups e demais mecanismos de segurança do Linux.
