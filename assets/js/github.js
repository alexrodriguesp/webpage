
const GitHubBlog = (() => {

  const BASE = '/webpage';
  const REPOSITORY = 'alexrodriguesp/webpage';

  async function carregarPosts() {

    const url = `https://api.github.com/repos/${REPOSITORY}/contents/_posts`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Erro ao consultar GitHub: ${response.status}`);
    }

    const files = await response.json();

    if (!Array.isArray(files)) {
      throw new Error('Resposta inválida da API do GitHub.');
    }

    const posts = [];

    for (const file of files) {

      if (!file.name.endsWith('.md')) {
        continue;
      }

      const contentResponse = await fetch(file.download_url);

      if (!contentResponse.ok) {
        console.error('Erro ao carregar artigo:', file.name);
        continue;
      }

      const content = await contentResponse.text();

      const match = content.match(
        /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/
      );

      if (!match) {
        console.warn('Front Matter não encontrado:', file.name);
        continue;
      }

      let metadata = {};

      try {
        metadata = jsyaml.load(match[1]) || {};
      } catch (error) {
        console.error('Erro no YAML:', file.name, error);
        continue;
      }

      let image = metadata.image || '';

      if (image && !image.startsWith('http')) {
        image = `${BASE}/${image.replace(/^\/+/, '')}`;
      }

      posts.push({
        filename: file.name,
        title: metadata.title || 'Artigo sem título',
        description: metadata.description || '',
        date: metadata.date || '',
        tags: metadata.tags || [],
        image,
        body: match[2]
      });

    }

    posts.sort((a, b) => {
      return new Date(b.date || 0) - new Date(a.date || 0);
    });

    return posts;
  }

  return {
    carregarPosts
  };

})();
