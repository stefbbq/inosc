// Isolate tests from the developer's git config (signing, hooks, default branch).
process.env.GIT_CONFIG_GLOBAL = '/dev/null'
process.env.GIT_CONFIG_NOSYSTEM = '1'
process.env.GIT_AUTHOR_NAME = 'inosc test'
process.env.GIT_AUTHOR_EMAIL = 'test@example.com'
process.env.GIT_COMMITTER_NAME = 'inosc test'
process.env.GIT_COMMITTER_EMAIL = 'test@example.com'
