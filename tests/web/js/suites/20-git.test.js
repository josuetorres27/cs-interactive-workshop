// Git station: the model (web/js/modules/gitsim.js), checked against hashes printed by real
// Git, and the station UI (web/js/modules/git.js) on a fake DOM.
'use strict';

module.exports = (t, { createEnv, read, loadOrder }) => {
  const load = (lang) => {
    const env = createEnv();
    if (lang) { env.localStorage.setItem('csworkshop-lang', lang); env.window.location.reload = () => {}; env.load('js/i18n.js'); }
    env.load('js/modules/gitsim.js');
    return { env, G: env.window.GitSim };
  };
  const { G } = load();
  const T0 = 1767225600; // the date used to get the reference hashes from real Git
  const repo = (files = {}) => new G.Repo({ files, time: T0 });
  const ok = (r, line) => { const o = r.run(line); t.ok(o.ok, `${line}: ${o.out}`); return o; };
  const bad = (r, line) => { const o = r.run(line); t.ok(!o.ok, `${line} should fail`); return o; };
  const sixCommits = () => {
    const r = repo({ 'a.txt': '1\n' });
    ok(r, 'git add .'); ok(r, 'git commit -m "c1"');
    for (let i = 2; i <= 6; i++) { ok(r, `echo ${i} > a.txt`); ok(r, `git commit -am "c${i}"`); }
    return r;
  };

  // Printed by real Git 2.34 (author Bit <bit@taller.local>, dates 1767225600 and 1767225660 -0600)
  const REF = {
    emptyBlob: 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391', helloBlob: 'ce013625030ba8dba906f756967f9e9ca394464a',
    readmeBlob: 'fccfec85b5274ae2db500cdfd8325d3295bf2a51', nulBlob: '20b5be91886d0b6f26dc98a225c0dac05fe2c86e',
    emptyTree: '4b825dc642cb6eb9a060e54bf8d69288fbee4904', treeHello: 'aaa96ced2d9a1c8e72c56b253a0e2fe78393feb7',
    treeTwo: 'c458f20aef222b4a47907bc850e70991f806a0d5', treeFour: '81379d1a20cb4f566cb78d2fb8e60f0f7b03f92e',
    treeExec: '98fdf9811d717ff3732a85097d50ccacd67d941d', commit1: 'e70ffc913748d7a7e6f8dfa316b6fff45268c31e',
    commit2: '767d0e38835494f1205eb373ad71ce29481ed214', merge: 'e235bcc34ab5f0d8a9ac9904180052dd6794fcde'
  };

  t.suite('git · SHA-1 and objects match real Git', () => {
    t.test('SHA-1 test vectors', () => {
      t.eq(G.sha1(''), 'da39a3ee5e6b4b0d3255bfef95601890afd80709');
      t.eq(G.sha1('abc'), 'a9993e364706816aba3e25717850c26c9cd0d89d');
      t.eq(G.sha1('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'), '84983e441c3bd26ebaae4aa1f95129e5e54670f1');
      t.eq(G.sha1('The quick brown fox jumps over the lazy dog'), '2fd4e1c67a2d28fced849ee1bb76e7391b93eb12');
    });
    t.test('SHA-1 of a long input (several blocks)', () => t.eq(G.sha1('a'.repeat(1000000)), '34aa973cd4c4daa4f61eeb2bdbad27316534016f'));
    t.test('blobs', () => {
      t.eq(G.hashBlob(''), REF.emptyBlob); t.eq(G.hashBlob('hello\n'), REF.helloBlob); t.eq(G.hashBlob('# Proyecto\n'), REF.readmeBlob);
      t.eq(G.hashObject('blob', new Uint8Array([97, 0, 98])), REF.nulBlob);
    });
    t.test('a blob hash is not the plain SHA-1 of the content', () => t.ok(G.hashBlob('hello\n') !== G.sha1('hello\n')));
    t.test('accented text is hashed as UTF-8, like Git', () => t.eq(G.hashObject('blob', G.utf8('ñ')), G.sha1(new Uint8Array([...G.utf8('blob 2'), 0, 0xc3, 0xb1]))));
    t.test('trees', () => {
      t.eq(G.hashObject('tree', G.treeBody([])), REF.emptyTree);
      t.eq(G.hashObject('tree', G.treeBody([{ name: 'hello.txt', sha: REF.helloBlob }])), REF.treeHello);
      t.eq(G.hashObject('tree', G.treeBody([{ name: 'hello.txt', sha: REF.helloBlob }, { name: 'README.md', sha: REF.readmeBlob }])), REF.treeTwo);
      t.eq(G.hashObject('tree', G.treeBody([{ name: 'hello.txt', mode: '100755', sha: REF.helloBlob }])), REF.treeExec);
    });
    t.test('tree entries are sorted byte by byte (capitals first)', () => {
      const e = [{ name: 'hello.txt', sha: REF.helloBlob }, { name: 'b.txt', sha: G.hashBlob('y\n') }, { name: 'Z.txt', sha: G.hashBlob('x\n') }, { name: 'README.md', sha: REF.readmeBlob }];
      t.eq(G.hashObject('tree', G.treeBody(e)), REF.treeFour);
    });
    t.test('commits, including a merge with two parents', () => {
      t.eq(G.hashObject('commit', G.commitBody({ tree: REF.treeHello, time: T0, message: 'Primer commit' })), REF.commit1);
      t.eq(G.hashObject('commit', G.commitBody({ tree: REF.treeTwo, parents: [REF.commit1], time: T0 + 60, message: 'Agrega README' })), REF.commit2);
      t.eq(G.hashObject('commit', G.commitBody({ tree: REF.treeTwo, parents: [REF.commit1, REF.commit2], time: T0 + 60, message: 'Merge' })), REF.merge);
    });
    t.test('the repository makes the same commits as real Git', () => {
      const r = repo({ 'hello.txt': 'hello\n' });
      ok(r, 'git add hello.txt'); ok(r, 'git commit -m "Primer commit"');
      t.eq(r.headSha(), REF.commit1); t.eq(r.commit(REF.commit1).tree, REF.treeHello);
      r.file('README.md', '# Proyecto\n'); ok(r, 'git add README.md'); ok(r, 'git commit -m "Agrega README"');
      t.eq(r.headSha(), REF.commit2); t.eq(r.commit(REF.commit2).tree, REF.treeTwo);
    });
    t.test('the C engine is tested against the same reference hashes', () => {
      const c = read('tests/vcs/test_minigit.c');
      Object.values(REF).forEach((h) => t.includes(c, h, h));
    });
    t.test('dates print like git log', () => t.eq(G.gitDate(G.START, '-0600'), 'Thu Jan 1 12:00:00 2026 -0600'));
  });

  t.suite('git · command line and three-way merge', () => {
    t.test('quotes, escaped quotes and redirections', () => {
      t.deepEq(G.tokenize('git commit -m "a b"').map((x) => x.text), ['git', 'commit', '-m', 'a b']);
      t.deepEq(G.tokenize("echo 'x y'>>f.txt").map((x) => x.text), ['echo', 'x y', '>>', 'f.txt']);
      t.eq(G.tokenize('echo "say \\"hi\\""')[1].text, 'say "hi"');
    });
    t.test('a change on one side is taken', () => t.eq(G.merge3('a\nb\nc\n', 'A\nb\nc\n', 'a\nb\nc\n').text, 'A\nb\nc\n'));
    t.test('changes to different lines merge cleanly', () => {
      const m = G.merge3('a\nb\nc\n', 'A\nb\nc\n', 'a\nb\nC\n'); t.eq(m.text, 'A\nb\nC\n'); t.eq(m.conflicts, 0);
    });
    t.test('the same change on both sides is not a conflict', () => t.eq(G.merge3('a\n', 'b\n', 'b\n').conflicts, 0));
    t.test('different changes to the same line conflict, with markers', () => {
      const m = G.merge3('x\nkeep\n', 'ours\nkeep\n', 'theirs\nkeep\n', ['HEAD', 'mate']);
      t.eq(m.conflicts, 1); t.eq(m.text, '<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> mate\nkeep\n');
    });
    t.test('lines added at the end by both sides conflict', () => t.eq(G.merge3('a\n', 'a\nb\n', 'a\nc\n').conflicts, 1));
    t.test('a deletion on one side wins over an untouched line', () => t.eq(G.merge3('a\nb\nc\n', 'a\nc\n', 'a\nb\nc\n').text, 'a\nc\n'));
    t.test('modify against delete is a conflict', () => {
      const m = G.mergeFiles({ f: '1\n' }, { f: '2\n' }, {}, ['HEAD', 'x']); t.deepEq(m.conflicts, ['f']); t.eq(m.kinds.f, 'modify/delete'); t.eq(m.files.f, '2\n');
    });
    t.test('a file added on one side is kept', () => t.deepEq(G.mergeFiles({}, {}, { n: 'new\n' }).files, { n: 'new\n' }));
  });

  t.suite('git · working tree, index and commits', () => {
    t.test('a new file is untracked until git add', () => {
      const r = repo({ 'a.txt': 'hi\n' });
      t.deepEq(r.status().untracked, ['a.txt']); ok(r, 'git add a.txt');
      t.deepEq(r.status().staged, [{ name: 'a.txt', kind: 'new' }]);
    });
    t.test('git add stores a blob before any commit exists', () => {
      const r = repo({ 'a.txt': 'hi\n' }); const o = ok(r, 'git add a.txt');
      t.deepEq(o.created, [G.hashBlob('hi\n')]); t.eq(r.headSha(), null);
    });
    t.test('adding the same content twice stores nothing new', () => {
      const r = repo({ 'a.txt': 'hi\n', 'b.txt': 'hi\n' }); ok(r, 'git add a.txt'); t.deepEq(ok(r, 'git add b.txt').created, []);
    });
    t.test('the first commit creates a tree and a root commit, and the branch is born', () => {
      const r = repo({ 'a.txt': 'hi\n' }); ok(r, 'git add .');
      const o = ok(r, 'git commit -m "Uno"');
      t.includes(o.out, '(root-commit)'); t.eq(o.created.length, 2); t.eq(r.refs.main, r.headSha()); t.eq(r.commit(r.headSha()).parents.length, 0);
    });
    t.test('a commit needs a message', () => { const r = repo({ 'a.txt': '1\n' }); ok(r, 'git add .'); t.includes(bad(r, 'git commit').out, 'empty commit message'); });
    t.test('nothing to commit when the index equals HEAD', () => { const r = sixCommits(); t.includes(bad(r, 'git commit -m "x"').out, 'nothing to commit'); });
    t.test('an unstaged change is not committed without -a', () => {
      const r = sixCommits(); ok(r, 'echo 7 > a.txt'); t.includes(bad(r, 'git commit -m "x"').out, 'no changes added');
      t.deepEq(r.status().unstaged, [{ name: 'a.txt', kind: 'modified' }]);
    });
    t.test('commit -a stages tracked files but not untracked ones', () => {
      const r = sixCommits(); ok(r, 'echo 7 > a.txt'); ok(r, 'echo new > b.txt'); ok(r, 'git commit -am "x"');
      t.ok(!('b.txt' in r.blobsOf(r.headSha()))); t.deepEq(r.status().untracked, ['b.txt']);
    });
    t.test('rm and git add record a deletion', () => {
      const r = sixCommits(); ok(r, 'rm a.txt'); ok(r, 'git add .'); t.deepEq(r.status().staged, [{ name: 'a.txt', kind: 'deleted' }]);
    });
    t.test('restore throws away changes; restore --staged unstages them', () => {
      const r = sixCommits(); ok(r, 'echo x > a.txt'); ok(r, 'git add a.txt'); ok(r, 'git restore --staged a.txt');
      t.eq(r.status().staged.length, 0); t.eq(r.work['a.txt'], 'x\n'); ok(r, 'git restore a.txt'); t.eq(r.work['a.txt'], '6\n');
    });
    t.test('status reads like Git', () => {
      const r = repo({ 'a.txt': '1\n' }); const s = ok(r, 'git status').out;
      t.includes(s, 'On branch main'); t.includes(s, 'No commits yet'); t.includes(s, 'Untracked files:');
    });
    t.test('log --oneline shows decorations, newest first', () => {
      const out = ok(sixCommits(), 'git log --oneline').out.split('\n');
      t.eq(out.length, 6); t.includes(out[0], '(HEAD -> main) c6'); t.ok(out[5].endsWith(' c1'));
    });
    t.test('the full log has author and date', () => {
      const r = repo({ 'a.txt': '1\n' }); ok(r, 'git add .'); ok(r, 'git commit -m "Uno"');
      const out = ok(r, 'git log').out; t.includes(out, 'Author: Bit <bit@taller.local>'); t.includes(out, 'Date:   Wed Dec 31 18:00:00 2025 -0600');
    });
  });

  t.suite('git · revisions and objects', () => {
    t.test('HEAD~n, ^ and short hashes', () => {
      const r = sixCommits(); const c = [...r.order];
      t.eq(r.resolve('HEAD'), c[5]); t.eq(r.resolve('HEAD~2'), c[3]); t.eq(r.resolve('HEAD^'), c[4]); t.eq(r.resolve('main~5'), c[0]);
      t.eq(r.resolve(c[2].slice(0, 7)), c[2]); t.eq(r.resolve('HEAD~9'), null);
    });
    t.test('HEAD@{n} reads the reflog', () => { const r = sixCommits(); ok(r, 'git reset --hard HEAD~3'); t.eq(r.resolve('HEAD@{1}'), r.order[5]); });
    t.test('an unknown revision is an error, not a crash', () => t.includes(bad(sixCommits(), 'git reset --hard nope').out, 'not a commit'));
    t.test('cat-file -t, -s and -p', () => {
      const r = repo({ 'hello.txt': 'hello\n' }); ok(r, 'git add .'); ok(r, 'git commit -m "Primer commit"');
      t.eq(ok(r, 'git cat-file -t HEAD').out, 'commit'); t.eq(ok(r, 'git cat-file -s ce01362').out, '6');
      t.includes(ok(r, 'git cat-file -p HEAD').out, `tree ${REF.treeHello}`);
      t.eq(ok(r, 'git cat-file -p HEAD^{tree}').out, `100644 blob ${REF.helloBlob}\thello.txt`);
      t.eq(ok(r, 'git cat-file -p HEAD:hello.txt').out, 'hello\n'.trim());
    });
    t.test('hash-object only stores with -w', () => {
      const r = repo({ 'hello.txt': 'hello\n' });
      t.eq(ok(r, 'git hash-object hello.txt').out, REF.helloBlob); t.eq(Object.keys(r.objects).length, 0);
      ok(r, 'git hash-object -w hello.txt'); t.ok(!!r.objects[REF.helloBlob]);
    });
    t.test('rev-parse gives the full hash', () => { const r = sixCommits(); t.eq(ok(r, 'git rev-parse HEAD~1').out, r.order[4]); });
    t.test('garbage never throws', () => {
      const r = sixCommits();
      ['', '   ', 'git', 'git nope', 'ls -la', 'cat', 'echo "x" >', 'echo x > ../evil', 'git cat-file', 'git checkout', 'rm nada', 'sudo rm -rf /'].forEach((l) => r.run(l));
      t.eq(r.order.length, 6);
    });
  });

  t.suite('git · branches, HEAD and merges', () => {
    t.test('a branch is a pointer: creating one stores no objects', () => {
      const r = sixCommits(); const o = ok(r, 'git branch feature');
      t.deepEq(o.created, []); t.eq(r.refs.feature, r.refs.main); t.eq(r.head.ref, 'main'); t.deepEq(o.moved.map((m) => m.ref), ['feature']);
    });
    t.test('switch -c moves HEAD without touching the files', () => {
      const r = sixCommits(); ok(r, 'echo dirty > a.txt'); ok(r, 'git switch -c feature');
      t.eq(r.head.ref, 'feature'); t.eq(r.work['a.txt'], 'dirty\n');
    });
    t.test('switching branches swaps the files', () => {
      const r = sixCommits(); ok(r, 'git switch -c f'); ok(r, 'echo f > a.txt'); ok(r, 'git commit -am "f"'); ok(r, 'git switch main');
      t.eq(r.work['a.txt'], '6\n'); ok(r, 'git switch f'); t.eq(r.work['a.txt'], 'f\n');
    });
    t.test('switching with uncommitted changes is refused', () => {
      const r = sixCommits(); ok(r, 'git branch old HEAD~3'); ok(r, 'echo x > a.txt'); t.includes(bad(r, 'git switch old').out, 'would be overwritten');
    });
    t.test('switch refuses a commit; checkout detaches HEAD', () => {
      const r = sixCommits(); bad(r, 'git switch HEAD~2'); const o = ok(r, 'git checkout HEAD~2');
      t.includes(o.out, 'detached HEAD'); t.eq(r.head.ref, undefined); t.eq(r.headSha(), r.order[3]); t.eq(r.work['a.txt'], '4\n');
    });
    t.test('leaving a commit made on a detached HEAD warns about it', () => {
      const r = sixCommits(); ok(r, 'git checkout HEAD~1'); ok(r, 'echo z > z.txt'); ok(r, 'git add .'); ok(r, 'git commit -m "exp"');
      t.includes(ok(r, 'git switch main').out, 'leaving 1 commit behind');
    });
    t.test('branch -d refuses unmerged work; -D forces it; the current branch is protected', () => {
      const r = sixCommits(); ok(r, 'git switch -c f'); ok(r, 'echo f > a.txt'); ok(r, 'git commit -am "f"');
      bad(r, 'git branch -d f'); ok(r, 'git switch main'); bad(r, 'git branch -d f'); ok(r, 'git branch -D f'); t.ok(!('f' in r.refs)); bad(r, 'git branch -d main');
    });
    t.test('fast-forward moves the pointer and makes no commit', () => {
      const r = sixCommits(); ok(r, 'git switch -c f'); ok(r, 'echo f > a.txt'); ok(r, 'git commit -am "f"'); ok(r, 'git switch main');
      const n = r.order.length; const o = ok(r, 'git merge f');
      t.includes(o.out, 'Fast-forward'); t.eq(r.order.length, n); t.eq(r.refs.main, r.refs.f);
    });
    t.test('--no-ff makes a merge commit anyway', () => {
      const r = sixCommits(); ok(r, 'git switch -c f'); ok(r, 'echo f > b.txt'); ok(r, 'git add .'); ok(r, 'git commit -m "f"'); ok(r, 'git switch main');
      ok(r, 'git merge --no-ff f'); t.eq(r.commit(r.headSha()).parents.length, 2);
    });
    t.test('a clean three-way merge has two parents and both changes', () => {
      const r = sixCommits(); ok(r, 'git switch -c f'); ok(r, 'echo f > f.txt'); ok(r, 'git add .'); ok(r, 'git commit -m "f"');
      ok(r, 'git switch main'); ok(r, 'echo m > m.txt'); ok(r, 'git add .'); ok(r, 'git commit -m "m"');
      const o = ok(r, 'git merge f'); t.includes(o.out, "Merge made by the 'ort' strategy.");
      const c = r.commit(r.headSha()); t.eq(c.parents.length, 2); t.eq(c.message, "Merge branch 'f'"); t.eq(r.work['f.txt'], 'f\n'); t.eq(r.work['m.txt'], 'm\n');
    });
    t.test('a merge already contained is "Already up to date."', () => { const r = sixCommits(); ok(r, 'git branch old HEAD~2'); t.eq(ok(r, 'git merge old').out, 'Already up to date.'); });
  });

  t.suite('git · conflicts', () => {
    const conflicted = () => {
      const r = sixCommits(); ok(r, 'git switch -c mate'); ok(r, 'echo mate > a.txt'); ok(r, 'git commit -am "mate"');
      ok(r, 'git switch main'); ok(r, 'echo mine > a.txt'); ok(r, 'git commit -am "mine"');
      const o = r.run('git merge mate'); return { r, o };
    };
    t.test('the merge stops with markers in the file', () => {
      const { r, o } = conflicted(); t.ok(!o.ok); t.includes(o.out, 'CONFLICT (content): Merge conflict in a.txt');
      t.eq(r.work['a.txt'], '<<<<<<< HEAD\nmine\n=======\nmate\n>>>>>>> mate\n'); t.deepEq(r.status().conflicts, ['a.txt']);
    });
    t.test('the commit is blocked until the file is added', () => { const { r } = conflicted(); t.includes(bad(r, 'git commit').out, 'unmerged files'); });
    t.test('switching and rebasing are refused mid-merge', () => { const { r } = conflicted(); bad(r, 'git switch mate'); bad(r, 'git rebase mate'); });
    t.test('--theirs, add and commit finish the merge with two parents', () => {
      const { r } = conflicted(); ok(r, 'git checkout --theirs a.txt'); t.eq(r.work['a.txt'], 'mate\n'); ok(r, 'git add a.txt');
      t.includes(ok(r, 'git commit').out, "Merge branch 'mate'"); t.eq(r.commit(r.headSha()).parents[1], r.refs.mate); t.eq(r.merging, null);
    });
    t.test('editing the file by hand also resolves it', () => {
      const { r } = conflicted(); ok(r, 'echo both > a.txt'); ok(r, 'git add a.txt'); ok(r, 'git commit -m "Resuelve"'); t.eq(r.filesOf(r.headSha())['a.txt'], 'both\n');
    });
    t.test('adding a file that still has markers is allowed but flagged', () => {
      const { r } = conflicted(); const note = ok(r, 'git add a.txt').note; t.includes(note, 'a.txt'); t.includes(note, 'marcadores');
    });
    t.test('merge --abort puts everything back', () => {
      const { r } = conflicted(); const head = r.headSha(); ok(r, 'git merge --abort');
      t.eq(r.merging, null); t.eq(r.headSha(), head); t.eq(r.work['a.txt'], 'mine\n'); t.eq(r.dirty(), false);
    });
    t.test('the prompt-facing state says MERGING', () => { const { r } = conflicted(); t.includes(ok(r, 'git status').out, 'You have unmerged paths.'); });
  });

  t.suite('git · rewriting and undoing', () => {
    t.test('reset --soft keeps the changes staged', () => {
      const r = sixCommits(); ok(r, 'git reset --soft HEAD~1'); t.eq(r.headSha(), r.order[4]); t.deepEq(r.status().staged, [{ name: 'a.txt', kind: 'modified' }]);
    });
    t.test('reset (mixed) keeps the changes in the files, unstaged', () => {
      const r = sixCommits(); ok(r, 'git reset HEAD~1'); t.deepEq(r.status().unstaged, [{ name: 'a.txt', kind: 'modified' }]); t.eq(r.work['a.txt'], '6\n');
    });
    t.test('reset --hard puts the files back too, but keeps untracked ones', () => {
      const r = sixCommits(); ok(r, 'echo u > u.txt'); ok(r, 'git reset --hard HEAD~2'); t.eq(r.work['a.txt'], '4\n'); t.eq(r.work['u.txt'], 'u\n'); t.eq(r.dirty(), false);
    });
    t.test('reset <file> unstages that file', () => { const r = sixCommits(); ok(r, 'echo 9 > a.txt'); ok(r, 'git add a.txt'); ok(r, 'git reset a.txt'); t.eq(r.status().staged.length, 0); });
    t.test('commits left behind by reset are still in the object store and the reflog', () => {
      const r = sixCommits(); const tip = r.headSha(); ok(r, 'git reset --hard HEAD~2');
      t.ok(!r.reachable().has(tip)); t.ok(!!r.objects[tip]); t.includes(ok(r, 'git reflog').out, `${tip.slice(0, 7)} HEAD@{1}`);
      ok(r, 'git reset --hard HEAD@{1}'); t.eq(r.headSha(), tip);
    });
    t.test('revert adds a commit that undoes another one', () => {
      const r = sixCommits(); ok(r, 'echo b > b.txt'); ok(r, 'git add .'); ok(r, 'git commit -m "b"'); ok(r, 'echo 7 > a.txt'); ok(r, 'git commit -am "c7"');
      const target = r.resolve('HEAD~1'); const n = r.order.length; const o = ok(r, 'git revert HEAD~1');
      t.eq(r.order.length, n + 1); t.includes(r.commit(r.headSha()).message, `This reverts commit ${target}.`); t.includes(o.out, 'Revert "b"');
      t.ok(!('b.txt' in r.work)); t.eq(r.work['a.txt'], '7\n'); t.ok(r.isAncestor(target, r.headSha()));
    });
    t.test('revert of a clashing change is refused and changes nothing', () => {
      const r = sixCommits(); const head = r.headSha(); bad(r, 'git revert HEAD~3'); t.eq(r.headSha(), head); t.eq(r.order.length, 6);
    });
    t.test('rebase copies the commits on top, with new hashes, and leaves the old ones unreachable', () => {
      const r = sixCommits(); ok(r, 'git switch -c f HEAD~2'); ok(r, 'echo f > f.txt'); ok(r, 'git add .'); ok(r, 'git commit -m "f1"');
      ok(r, 'echo g > g.txt'); ok(r, 'git add .'); ok(r, 'git commit -m "f2"');
      const old = r.headSha(); ok(r, 'git rebase main');
      t.ok(r.headSha() !== old); t.ok(r.isAncestor(r.refs.main, r.refs.f)); t.ok(!r.reachable().has(old));
      t.eq(r.commit(r.headSha()).message, 'f2'); t.eq(r.commit(r.commit(r.headSha()).parents[0]).parents[0], r.refs.main);
    });
    t.test('a rebase that hits a conflict is cancelled and changes nothing', () => {
      const r = sixCommits(); ok(r, 'git switch -c f HEAD~1'); ok(r, 'echo other > a.txt'); ok(r, 'git commit -am "f"');
      const head = r.headSha(), commits = r.order.length; const o = bad(r, 'git rebase main');
      t.includes(o.out, 'could not apply'); t.eq(r.headSha(), head); t.eq(r.order.length, commits); t.eq(r.work['a.txt'], 'other\n');
    });
    t.test('rebase onto an ancestor is "up to date"', () => { const r = sixCommits(); ok(r, 'git switch -c f'); t.includes(ok(r, 'git rebase HEAD~2').out, 'up to date'); });
  });

  t.suite('git · missions', () => {
    G.SCENARIOS.forEach((s) => {
      t.test(`${s.id}: not done at the start${s.item ? ', done after its suggested commands' : ''}`, () => {
        const sc = G.scenario(s.id);
        t.eq(sc.done(), false);
        s.tries.forEach((l) => sc.repo.run(l));
        t.eq(sc.done(), !!s.item);
      });
    });
    t.test('every mission maps to a checklist item of the station', () => {
      const env = createEnv(); env.load('js/progress.js');
      const items = env.window.Progress.CHECKLISTS.git.items.map((i) => i.id).sort();
      t.deepEq(G.SCENARIOS.filter((s) => s.item).map((s) => s.item).sort(), items);
    });
    t.test('missions are built the same way every time (same hashes)', () => G.SCENARIOS.forEach((s) => t.deepEq(G.scenario(s.id).repo.order, G.scenario(s.id).repo.order, s.id)));
    t.test('a mission starts with an empty change log', () => G.SCENARIOS.forEach((s) => t.deepEq(G.scenario(s.id).repo.ev, { created: [], moved: [] }, s.id)));
    t.test('the conflict mission really conflicts', () => { const sc = G.scenario('conflict'); t.ok(!sc.repo.run('git merge companero').ok); });
    t.test('the reflog mission is not solved by a new commit on main', () => {
      const sc = G.scenario('reflog'); sc.repo.run('echo x > x.txt'); sc.repo.run('git add .'); sc.repo.run('git commit -m "x"'); t.eq(sc.done(), false);
    });
    t.test('the revert mission is not solved by rewriting history', () => { const sc = G.scenario('revert'); sc.repo.run('git reset --hard HEAD~1'); t.eq(sc.done(), false); });
    t.test('the rebase mission is not solved by a merge', () => { const sc = G.scenario('rebase'); sc.repo.run('git merge main'); t.eq(sc.done(), false); });
    t.test('in English the missions, files and notes have no Spanish left', () => {
      const { G: E } = load('en');
      const SPANISH = /[áéíóúñÁÉÍÓÚÑ¿¡]/;
      E.SCENARIOS.forEach((s) => {
        [s.title, s.brief, s.goal, s.hint, ...s.tries].forEach((x) => t.ok(!SPANISH.test(x), `${s.id}: ${x}`));
        const sc = E.scenario(s.id);
        Object.values(sc.repo.work).forEach((x) => t.ok(!SPANISH.test(x), `${s.id} file: ${x}`));
        s.tries.forEach((l) => { const o = sc.repo.run(l); t.ok(!SPANISH.test(o.note), `${s.id} ${l}: ${o.note}`); });
        t.eq(sc.done(), !!s.item, s.id);
      });
    });
  });

  t.suite('git · station UI', () => {
    const fresh = () => {
      const env = createEnv();
      env.load('js/progress.js');
      env.load('js/modules/gitsim.js');
      env.load('js/modules/git.js');
      const calls = [];
      env.window.account = { record: (st, item) => calls.push([st, item]) };
      const stn = env.window.gitStation; stn.init();
      return { env, stn, calls, $: (id) => env.document.getElementById(id) };
    };
    t.test('one chip per mission, starting with the first commit', () => {
      const { stn, $ } = fresh();
      t.eq(($('gitMissions').innerHTML.match(/data-mission=/g) || []).length, G.SCENARIOS.length); t.eq(stn.mission, 'first-commit');
      t.eq($('gitMissionTitle').textContent, 'Tu primer commit');
    });
    t.test('the prompt shows the branch, a detached hash or a merge in progress', () => {
      const { stn, $ } = fresh(); t.eq($('gitPrompt').textContent, '(main) $');
      stn.load('detached'); t.eq($('gitPrompt').textContent, `(${stn.sc.repo.short(stn.sc.repo.head.sha)}) $`);
      stn.load('conflict'); stn.exec('git merge companero'); t.eq($('gitPrompt').textContent, '(main|MERGING) $');
    });
    t.test('commands and their output go to the terminal; errors are marked', () => {
      const { stn, $ } = fresh(); stn.exec('git status'); t.includes($('gitOut').innerHTML, 'git-line-cmd'); t.includes($('gitOut').innerHTML, 'On branch main');
      stn.exec('git nope'); t.includes($('gitOut').innerHTML, 'git-line-err');
    });
    t.test('the output is escaped', () => { const { stn, $ } = fresh(); stn.exec('echo <b>x</b>'); t.notIncludes($('gitOut').innerHTML, '<b>x'); t.includes($('gitOut').innerHTML, '&lt;b&gt;'); });
    t.test('clear empties the terminal', () => { const { stn } = fresh(); stn.exec('git status'); stn.exec('clear'); t.eq(stn.lines.length, 0); });
    t.test('the submitted form runs the command and empties the input', () => {
      const { stn, $ } = fresh(); $('gitInput').value = 'git add README.md'; $('gitForm').dispatch('submit');
      t.eq($('gitInput').value, ''); t.eq(Object.keys(stn.sc.repo.index).length, 1);
    });
    t.test('↑ brings back the previous command', () => {
      const { stn, $ } = fresh(); stn.exec('git status'); stn.exec('ls');
      $('gitInput').dispatch('keydown', { key: 'ArrowUp' }); t.eq($('gitInput').value, 'ls');
      $('gitInput').dispatch('keydown', { key: 'ArrowUp' }); t.eq($('gitInput').value, 'git status');
    });
    t.test('a suggested command fills the input without running it', () => {
      const { stn, $ } = fresh(); $('gitTries').dispatch('click', { target: { closest: () => ({ dataset: { cmd: 'git status' } }) } });
      t.eq($('gitInput').value, 'git status'); t.eq(stn.history.length, 0);
    });
    t.test('finishing a mission records it once and says so', () => {
      const { stn, calls, $ } = fresh(); stn.exec('git add README.md'); t.eq(calls.length, 0);
      stn.exec('git commit -m "Uno"'); t.deepEq(calls, [['git', 'commit']]); t.eq($('gitNoteTitle').textContent, '¡Misión cumplida!');
      t.eq($('gitMissionState').textContent, 'Cumplida');
    });
    t.test('the free mission never records anything', () => { const { stn, calls } = fresh(); stn.load('sandbox'); stn.exec('git add .'); stn.exec('git commit -m "x"'); t.eq(calls.length, 0); });
    t.test('the graph draws one node per commit, with branch and HEAD labels', () => {
      const { stn, $ } = fresh(); stn.load('branch'); stn.exec('git switch -c feature');
      const svg = $('gitGraphBox').innerHTML;
      t.eq((svg.match(/class="git-node/g) || []).length, stn.sc.repo.order.length); t.includes(svg, 'HEAD→feature'); t.includes(svg, '>main<');
    });
    t.test('an empty history says so', () => { const { $ } = fresh(); t.includes($('gitGraphBox').innerHTML, 'git-empty'); });
    t.test('layout: main on the first lane, a branch on its own lane', () => {
      const { stn } = fresh(); stn.load('rebase');
      const L = stn.layout(); const lane = (s) => L.nodes.find((n) => n.sha === s).lane;
      t.eq(lane(stn.sc.repo.refs.main), 0); t.eq(lane(stn.sc.repo.refs.feature), 1); t.eq(L.lanes, 2);
    });
    t.test('layout: commits no ref reaches are drawn apart and marked as lost', () => {
      const { stn } = fresh(); stn.load('reflog'); const L = stn.layout();
      const lost = L.nodes.filter((n) => !n.reachable); t.eq(lost.length, 2); t.ok(lost.every((n) => n.lane === 1));
    });
    t.test('layout: a detached HEAD gets its own label', () => { const { stn } = fresh(); stn.load('detached'); t.ok(stn.layout().nodes.some((n) => n.labels.some((l) => l.detached))); });
    t.test('the areas mark untracked, staged and conflicted files', () => {
      const { stn, $ } = fresh(); t.includes($('gitWork').innerHTML, '>U</b>README.md');
      stn.exec('git add README.md'); t.includes($('gitIndex').innerHTML, '>A</b>README.md');
      stn.load('conflict'); stn.exec('git merge companero'); t.includes($('gitWork').innerHTML, 'git-file conflict');
    });
    t.test('refs show where HEAD points and what just moved', () => {
      const { stn, $ } = fresh(); t.includes($('gitRefs').innerHTML, 'refs/heads/main');
      stn.exec('git add .'); stn.exec('git commit -m "Uno"'); t.includes($('gitRefs').innerHTML, 'git-ref moved');
    });
    t.test('the object list counts and marks new objects', () => {
      const { stn, $ } = fresh(); stn.exec('git add README.md'); t.eq($('gitObjCount').textContent, '0 commits · 0 árboles · 1 blobs');
      t.includes($('gitObjList').innerHTML, 'git-obj t-blob is-new');
    });
    t.test('inspecting an object shows git cat-file -p with clickable hashes', () => {
      const { stn, $ } = fresh(); stn.exec('git add .'); stn.exec('git commit -m "Uno"'); stn.inspect(stn.sc.repo.headSha());
      const v = $('gitObjView').innerHTML; t.includes(v, 'git cat-file -p'); t.includes(v, `data-sha="${stn.sc.repo.commit(stn.sc.repo.headSha()).tree}"`);
    });
    t.test('a file in the working directory shows its content', () => {
      const { stn, $ } = fresh(); stn.inspectFile('README.md', 'work'); t.includes($('gitObjView').innerHTML, 'cat README.md');
    });
    t.test('restarting a mission rebuilds its repository', () => {
      const { stn } = fresh(); stn.exec('git add .'); stn.load('first-commit'); t.eq(Object.keys(stn.sc.repo.index).length, 0);
    });
    t.test('Understand and Implement are filled in', () => {
      const { $ } = fresh(); t.includes($('gitLearn').innerHTML, 'learn-card'); t.includes($('gitBuild').innerHTML, 'mg_hash_object');
    });
    t.test('the C shown in Implement is the real engine code', () => {
      const env = createEnv(); env.load('js/modules/git.js', []); const S = env.window.gitStation.constructor;
      const src = read('core-c-engines/vcs/src/minigit.c').replace(/\r\n/g, '\n');
      [S.HASH_SNIPPET, S.REF_SNIPPET].forEach((snip) => t.includes(src, snip.join('\n')));
    });
  });

  t.suite('git · wiring', () => {
    const html = read('web/index.html');
    t.test('the model loads before the station', () => { const order = loadOrder(); t.ok(order.indexOf('js/modules/gitsim.js') !== -1 && order.indexOf('js/modules/gitsim.js') < order.indexOf('js/modules/git.js')); });
    t.test('the station lives on its own bench', () => {
      const env = createEnv(); const { MODULES, AREAS } = env.load('js/app.js', ['MODULES', 'AREAS']);
      t.eq(MODULES.git.area, 'engineering'); t.ok(!!AREAS.engineering); t.includes(html, 'href="#/area/engineering" class="bench"');
    });
    t.test('#/workshop/git/play opens the experiment', () => {
      const env = createEnv(); env.load('js/modules/gitsim.js'); env.load('js/modules/git.js');
      const { App } = env.load('js/app.js', ['App']); const app = new App(); app.init();
      env.location.hash = '#/workshop/git/play'; app.handleRoute(); t.eq(app.currentTab, 'git'); t.eq(app.currentStep, 'play');
    });
    t.test('every element the station uses exists in the page', () => {
      const src = read('web/js/modules/git.js');
      [...src.matchAll(/this\.\$\('(\w+)'\)/g)].forEach((m) => t.includes(html, `id="${m[1]}"`, m[1]));
    });
  });
};
