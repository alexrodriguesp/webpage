
const MarkdownRenderer = (() => {

  // Configuração do Marked
  marked.setOptions({
    gfm: true,
    breaks: false
  });

  function renderizar(markdown) {

    // Converte Markdown em HTML
    const html = marked.parse(markdown);

    // Remove HTML potencialmente perigoso
    return DOMPurify.sanitize(html, {
      USE_PROFILES: {
        html: true
      }
    });

  }

  function formatar(container) {

    // Destaca a sintaxe dos blocos de código
    container.querySelectorAll('pre code').forEach((code) => {

      hljs.highlightElement(code);

      const pre = code.parentElement;

      const wrapper = document.createElement('div');
      wrapper.className = 'code-block';

      const toolbar = document.createElement('div');
      toolbar.className = 'code-toolbar';

      const language = document.createElement('span');
      language.className = 'code-language';

      const languageMatch = code.className.match(/language-([\w-]+)/);

      language.textContent = languageMatch
        ? languageMatch[1]
        : 'Código';

      const copyButton = document.createElement('button');
      copyButton.className = 'copy-code';
      copyButton.textContent = 'Copiar código';

      copyButton.addEventListener('click', async () => {

        try {

          await navigator.clipboard.writeText(code.textContent);

          copyButton.textContent = 'Copiado!';

        } catch (error) {

          console.error('Erro ao copiar:', error);
          copyButton.textContent = 'Erro ao copiar';

        }

        setTimeout(() => {
          copyButton.textContent = 'Copiar código';
        }, 2000);

      });

      toolbar.append(language, copyButton);

      pre.parentNode.insertBefore(wrapper, pre);

      wrapper.append(toolbar, pre);

    });

    // Abre links externos em nova aba
    container.querySelectorAll('a[href]').forEach((link) => {

      const url = new URL(link.href, window.location.href);

      if (url.origin !== window.location.origin) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }

    });

    // Permite rolagem horizontal nas tabelas
    container.querySelectorAll('table').forEach((table) => {

      const wrapper = document.createElement('div');
      wrapper.className = 'table-wrapper';

      table.parentNode.insertBefore(wrapper, table);

      wrapper.appendChild(table);

    });

  }

  return {
    renderizar,
    formatar
  };

})();
