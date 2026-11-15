
document.addEventListener('DOMContentLoaded', iniciarBlog);

async function iniciarBlog() {

  const container = document.getElementById('posts');

  try {

    const posts = await GitHubBlog.carregarPosts();

    container.innerHTML = '';

    if (posts.length === 0) {

      container.textContent = 'Nenhum artigo encontrado.';
      return;

    }

    posts.forEach((post) => {

      const card = criarCard(post);

      container.appendChild(card);

    });

  } catch (error) {

    console.error('Erro ao iniciar blog:', error);

    container.textContent =
      'Não foi possível carregar os artigos. Tente novamente mais tarde.';

  }

}

function criarCard(post) {

  const card = document.createElement('article');

  card.className = 'card';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');

  if (post.image) {

    const image = document.createElement('img');

    image.className = 'card-image';
    image.src = post.image;
    image.alt = post.title;

    image.onerror = () => {

      const placeholder = document.createElement('div');

      placeholder.className = 'no-img';
      placeholder.textContent = '📷';

      image.replaceWith(placeholder);

    };

    card.appendChild(image);

  } else {

    const placeholder = document.createElement('div');

    placeholder.className = 'no-img';
    placeholder.textContent = '📷';

    card.appendChild(placeholder);

  }

  const body = document.createElement('div');
  body.className = 'card-body';

  const title = document.createElement('h2');
  title.textContent = post.title;

  const description = document.createElement('p');
  description.textContent =
    post.description || 'Clique para ler o artigo completo.';

  const readMore = document.createElement('span');
  readMore.className = 'read-more';
  readMore.textContent = 'Ler artigo →';

  body.append(title, description, readMore);

  card.appendChild(body);

  card.addEventListener('click', () => {
    abrirModal(post);
  });

  card.addEventListener('keydown', (event) => {

    if (event.key === 'Enter' || event.key === ' ') {

      event.preventDefault();
      abrirModal(post);

    }

  });

  return card;

}

function abrirModal(post) {

  const modal = document.getElementById('modal');
  const content = document.getElementById('modal-content');

  content.innerHTML = '';

  // Botão fechar
  const closeButton = document.createElement('button');

  closeButton.className = 'close-btn';
  closeButton.textContent = '✕';
  closeButton.setAttribute('aria-label', 'Fechar artigo');

  closeButton.addEventListener('click', fecharModal);

  content.appendChild(closeButton);

  // Cabeçalho
  const header = document.createElement('header');
  header.className = 'modal-header';

  if (post.image) {

    const image = document.createElement('img');

    image.src = post.image;
    image.alt = post.title;

    header.appendChild(image);

  }

  const title = document.createElement('h2');

  title.id = 'article-title';
  title.textContent = post.title;

  header.appendChild(title);

  if (post.date) {

    const date = document.createElement('p');

    date.className = 'modal-description';
    date.textContent = `Publicado em ${post.date}`;

    header.appendChild(date);

  }

  if (post.description) {

    const description = document.createElement('p');

    description.className = 'modal-description';
    description.textContent = post.description;

    header.appendChild(description);

  }

  content.appendChild(header);

  // Conteúdo Markdown
  const articleBody = document.createElement('div');

  articleBody.className = 'markdown-body';

  articleBody.innerHTML = MarkdownRenderer.renderizar(post.body);

  content.appendChild(articleBody);

  // Aplica cores e botões aos blocos de código
  MarkdownRenderer.formatar(articleBody);

  // Exibe modal
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');

  document.body.style.overflow = 'hidden';

  closeButton.focus();

}

function fecharModal() {

  const modal = document.getElementById('modal');

  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');

  document.body.style.overflow = '';

}

// Fecha ao clicar fora do artigo
document.getElementById('modal').addEventListener('click', (event) => {

  if (event.target === event.currentTarget) {
    fecharModal();
  }

});

// Fecha com ESC
document.addEventListener('keydown', (event) => {

  if (event.key === 'Escape') {
    fecharModal();
  }

});
