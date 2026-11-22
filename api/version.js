export default async function handler(req, res) {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || '';
  const commit = sha ? sha.slice(0, 7) : 'dev';
  let date = null;

  if (sha) {
    try {
      const r = await fetch(`https://api.github.com/repos/AlexeySushkov/JARVIS/commits/${sha}`, {
        headers: { accept: 'application/vnd.github+json', 'user-agent': 'jarvis-pwa' },
      });
      if (r.ok) {
        const j = await r.json();
        date = (j && j.commit && j.commit.committer && j.commit.committer.date) || null;
      }
    } catch (err) {
      date = null;
    }
  }

  res.setHeader('cache-control', 'public, s-maxage=3600');
  return res.status(200).json({ commit, date });
}
