#!/usr/bin/env node
// Used only by git's private credential prompt; never write the token to disk.
const prompt=process.argv[2]||'';
process.stdout.write(/username/i.test(prompt)?'x-access-token':(process.env.GH_TOKEN||process.env.GITHUB_TOKEN||''));
