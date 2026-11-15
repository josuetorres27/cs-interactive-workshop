/**
 * CS Interactive Workshop - minigit Test Suite
 * 42 tests: SHA-1 vectors, Git-compatible blob/tree/commit hashes (checked against
 * real Git), the object store on disk, refs and tree snapshots of a folder.
 */
#define _POSIX_C_SOURCE 200809L

#include <dirent.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>

#include "../runner.h"
#include "minigit.h"
#include "sha1.h"

/* Hashes printed by real Git 2.34 for the same content, author and date */
#define EMPTY_BLOB  "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"
#define HELLO_BLOB  "ce013625030ba8dba906f756967f9e9ca394464a"
#define README_BLOB "fccfec85b5274ae2db500cdfd8325d3295bf2a51"
#define EMPTY_TREE  "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
#define TREE_HELLO  "aaa96ced2d9a1c8e72c56b253a0e2fe78393feb7"
#define TREE_TWO    "c458f20aef222b4a47907bc850e70991f806a0d5"
#define TREE_FOUR   "81379d1a20cb4f566cb78d2fb8e60f0f7b03f92e"
#define TREE_EXEC   "98fdf9811d717ff3732a85097d50ccacd67d941d"
#define COMMIT_1    "e70ffc913748d7a7e6f8dfa316b6fff45268c31e"
#define COMMIT_2    "767d0e38835494f1205eb373ad71ce29481ed214"
#define COMMIT_M    "e235bcc34ab5f0d8a9ac9904180052dd6794fcde"

static const mg_signature BIT_1 = { "Bit", "bit@taller.local", 1767225600LL, "-0600" };
static const mg_signature BIT_2 = { "Bit", "bit@taller.local", 1767225660LL, "-0600" };

/* ── Helpers ─────────────────────────────────────────────────────────── */

static void sha1_hex(const void *data, size_t len, char hex[MG_HEX_SIZE]) {
    unsigned char d[20];
    mg_sha1(data, len, d);
    mg_to_hex(d, hex);
}

static void blob_hex(const char *text, char hex[MG_HEX_SIZE]) {
    mg_hash_object("blob", (const unsigned char *)text, strlen(text), hex);
}

static void entry(mg_entry *e, const char *mode, const char *name, const char *hex) {
    snprintf(e->mode, sizeof e->mode, "%s", mode);
    snprintf(e->name, sizeof e->name, "%s", name);
    snprintf(e->hex, sizeof e->hex, "%s", hex);
}

static void tree_hex(mg_entry *entries, size_t n, char hex[MG_HEX_SIZE]) {
    mg_buf body = {0};
    mg_tree_body(entries, n, &body);
    mg_hash_object("tree", body.data ? body.data : (const unsigned char *)"", body.len, hex);
    mg_buf_free(&body);
}

static void commit_hex(const char *tree, const char *const *parents, size_t np, const mg_signature *who,
                       const char *msg, char hex[MG_HEX_SIZE]) {
    mg_buf body = {0};
    mg_commit_body(&body, tree, parents, np, who, msg);
    mg_hash_object("commit", body.data, body.len, hex);
    mg_buf_free(&body);
}

static void rm_rf(const char *path) {
    DIR *d = opendir(path);
    if (d) {
        struct dirent *e;
        while ((e = readdir(d)) != NULL) {
            if (strcmp(e->d_name, ".") == 0 || strcmp(e->d_name, "..") == 0) continue;
            char child[2048];
            snprintf(child, sizeof child, "%s/%s", path, e->d_name);
            rm_rf(child);
        }
        closedir(d);
        rmdir(path);
    } else {
        unlink(path);
    }
}

typedef struct { char root[256]; char git[300]; } sandbox_t;

static void sandbox_open(sandbox_t *s) {
    snprintf(s->root, sizeof s->root, "/tmp/minigit_test_XXXXXX");
    if (!mkdtemp(s->root)) { perror("mkdtemp"); exit(1); }
    snprintf(s->git, sizeof s->git, "%s/.minigit", s->root);
    mg_init(s->git);
}

static void sandbox_file(const sandbox_t *s, const char *name, const char *text, int exec) {
    char path[512];
    snprintf(path, sizeof path, "%s/%s", s->root, name);
    FILE *f = fopen(path, "wb");
    fputs(text, f);
    fclose(f);
    chmod(path, exec ? 0755 : 0644);
}

#define TEST(name) static void name(void)

/* ── SHA-1 ───────────────────────────────────────────────────────────── */

TEST(sha1_empty) {
    char hex[MG_HEX_SIZE]; sha1_hex("", 0, hex);
    ASSERT_STR_EQ(hex, "da39a3ee5e6b4b0d3255bfef95601890afd80709");
}
TEST(sha1_abc) {
    char hex[MG_HEX_SIZE]; sha1_hex("abc", 3, hex);
    ASSERT_STR_EQ(hex, "a9993e364706816aba3e25717850c26c9cd0d89d");
}
TEST(sha1_two_blocks) {
    const char *m = "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq";
    char hex[MG_HEX_SIZE]; sha1_hex(m, strlen(m), hex);
    ASSERT_STR_EQ(hex, "84983e441c3bd26ebaae4aa1f95129e5e54670f1");
}
TEST(sha1_fox) {
    const char *m = "The quick brown fox jumps over the lazy dog";
    char hex[MG_HEX_SIZE]; sha1_hex(m, strlen(m), hex);
    ASSERT_STR_EQ(hex, "2fd4e1c67a2d28fced849ee1bb76e7391b93eb12");
}
TEST(sha1_million_a) {
    mg_sha1_ctx ctx; mg_sha1_init(&ctx);
    char chunk[1000]; memset(chunk, 'a', sizeof chunk);
    for (int i = 0; i < 1000; i++) mg_sha1_update(&ctx, chunk, sizeof chunk);
    unsigned char d[20]; mg_sha1_final(&ctx, d);
    char hex[MG_HEX_SIZE]; mg_to_hex(d, hex);
    ASSERT_STR_EQ(hex, "34aa973cd4c4daa4f61eeb2bdbad27316534016f");
}
TEST(sha1_streaming_matches_one_shot) {
    unsigned char data[300];
    for (int i = 0; i < 300; i++) data[i] = (unsigned char)(i * 7 + 3);
    char whole[MG_HEX_SIZE]; sha1_hex(data, sizeof data, whole);
    size_t cuts[] = { 1, 55, 56, 63, 64, 65, 128, 299 };
    for (size_t c = 0; c < sizeof cuts / sizeof cuts[0]; c++) {
        mg_sha1_ctx ctx; mg_sha1_init(&ctx);
        mg_sha1_update(&ctx, data, cuts[c]);
        mg_sha1_update(&ctx, data + cuts[c], sizeof data - cuts[c]);
        unsigned char d[20]; mg_sha1_final(&ctx, d);
        char hex[MG_HEX_SIZE]; mg_to_hex(d, hex);
        ASSERT_STR_EQ(hex, whole);
    }
}
TEST(sha1_padding_boundaries_differ) {
    /* 55, 56 and 64 bytes need one, two and two blocks of padding: all must still be distinct */
    char a[MG_HEX_SIZE], b[MG_HEX_SIZE], c[MG_HEX_SIZE];
    char m[64]; memset(m, 'x', sizeof m);
    sha1_hex(m, 55, a); sha1_hex(m, 56, b); sha1_hex(m, 64, c);
    ASSERT_TRUE(strcmp(a, b) != 0); ASSERT_TRUE(strcmp(b, c) != 0); ASSERT_EQ(strlen(a), 40);
}

/* ── Hex ─────────────────────────────────────────────────────────────── */

TEST(hex_round_trip) {
    unsigned char raw[20];
    ASSERT_EQ(mg_from_hex(HELLO_BLOB, raw), 0);
    char back[MG_HEX_SIZE]; mg_to_hex(raw, back);
    ASSERT_STR_EQ(back, HELLO_BLOB);
    ASSERT_EQ(raw[0], 0xce); ASSERT_EQ(raw[19], 0x4a);
}
TEST(hex_rejects_bad_input) {
    unsigned char raw[20];
    ASSERT_EQ(mg_from_hex("xyz", raw), -1);
    ASSERT_EQ(mg_from_hex("ce013625030ba8dba906f756967f9e9ca394464A", raw), -1);   /* uppercase */
    ASSERT_EQ(mg_from_hex("ce013625030ba8dba906f756967f9e9ca394464", raw), -1);    /* 39 digits */
}

/* ── Objects: same hashes as Git ─────────────────────────────────────── */

TEST(blob_empty) { char h[MG_HEX_SIZE]; blob_hex("", h); ASSERT_STR_EQ(h, EMPTY_BLOB); }
TEST(blob_hello) { char h[MG_HEX_SIZE]; blob_hex("hello\n", h); ASSERT_STR_EQ(h, HELLO_BLOB); }
TEST(blob_readme) { char h[MG_HEX_SIZE]; blob_hex("# Proyecto\n", h); ASSERT_STR_EQ(h, README_BLOB); }
TEST(blob_with_nul_byte) {
    char h[MG_HEX_SIZE];
    mg_hash_object("blob", (const unsigned char *)"a\0b", 3, h);
    ASSERT_STR_EQ(h, "20b5be91886d0b6f26dc98a225c0dac05fe2c86e");
}
TEST(blob_is_not_the_plain_sha1) {
    char blob[MG_HEX_SIZE], plain[MG_HEX_SIZE];
    blob_hex("hello\n", blob); sha1_hex("hello\n", 6, plain);
    ASSERT_TRUE(strcmp(blob, plain) != 0);   /* the "blob 6\0" header changes everything */
}
TEST(tree_empty) { char h[MG_HEX_SIZE]; tree_hex(NULL, 0, h); ASSERT_STR_EQ(h, EMPTY_TREE); }
TEST(tree_one_file) {
    mg_entry e[1]; entry(&e[0], "100644", "hello.txt", HELLO_BLOB);
    char h[MG_HEX_SIZE]; tree_hex(e, 1, h); ASSERT_STR_EQ(h, TREE_HELLO);
}
TEST(tree_two_files) {
    mg_entry e[2]; entry(&e[0], "100644", "hello.txt", HELLO_BLOB); entry(&e[1], "100644", "README.md", README_BLOB);
    char h[MG_HEX_SIZE]; tree_hex(e, 2, h); ASSERT_STR_EQ(h, TREE_TWO);
}
TEST(tree_sorts_by_bytes) {
    char x[MG_HEX_SIZE], y[MG_HEX_SIZE]; blob_hex("x\n", x); blob_hex("y\n", y);
    mg_entry e[4];
    entry(&e[0], "100644", "hello.txt", HELLO_BLOB); entry(&e[1], "100644", "b.txt", y);
    entry(&e[2], "100644", "Z.txt", x); entry(&e[3], "100644", "README.md", README_BLOB);
    char h[MG_HEX_SIZE]; tree_hex(e, 4, h);
    ASSERT_STR_EQ(h, TREE_FOUR);
    ASSERT_STR_EQ(e[0].name, "README.md"); ASSERT_STR_EQ(e[1].name, "Z.txt"); ASSERT_STR_EQ(e[2].name, "b.txt");
}
TEST(tree_executable_mode) {
    mg_entry e[1]; entry(&e[0], "100755", "hello.txt", HELLO_BLOB);
    char h[MG_HEX_SIZE]; tree_hex(e, 1, h); ASSERT_STR_EQ(h, TREE_EXEC);
}
TEST(tree_parse_round_trip) {
    mg_entry e[2]; entry(&e[0], "100644", "hello.txt", HELLO_BLOB); entry(&e[1], "100755", "README.md", README_BLOB);
    mg_buf body = {0}; mg_tree_body(e, 2, &body);
    ASSERT_EQ(body.len, (size_t)(6 + 1 + 9 + 1 + 20 + 6 + 1 + 9 + 1 + 20));
    mg_entry back[4]; size_t n = 0;
    ASSERT_EQ(mg_parse_tree(&body, back, 4, &n), 0);
    ASSERT_EQ(n, 2);
    ASSERT_STR_EQ(back[0].name, "README.md"); ASSERT_STR_EQ(back[0].mode, "100755"); ASSERT_STR_EQ(back[0].hex, README_BLOB);
    ASSERT_STR_EQ(back[1].name, "hello.txt"); ASSERT_STR_EQ(back[1].hex, HELLO_BLOB);
    mg_buf_free(&body);
}
TEST(commit_body_text) {
    mg_buf body = {0};
    mg_commit_body(&body, TREE_HELLO, NULL, 0, &BIT_1, "Primer commit");
    ASSERT_STR_EQ((const char *)body.data,
        "tree " TREE_HELLO "\n"
        "author Bit <bit@taller.local> 1767225600 -0600\n"
        "committer Bit <bit@taller.local> 1767225600 -0600\n"
        "\n"
        "Primer commit\n");
    mg_buf_free(&body);
}
TEST(commit_root) { char h[MG_HEX_SIZE]; commit_hex(TREE_HELLO, NULL, 0, &BIT_1, "Primer commit", h); ASSERT_STR_EQ(h, COMMIT_1); }
TEST(commit_child) {
    const char *p[] = { COMMIT_1 };
    char h[MG_HEX_SIZE]; commit_hex(TREE_TWO, p, 1, &BIT_2, "Agrega README", h); ASSERT_STR_EQ(h, COMMIT_2);
}
TEST(commit_merge_two_parents) {
    const char *p[] = { COMMIT_1, COMMIT_2 };
    char h[MG_HEX_SIZE]; commit_hex(TREE_TWO, p, 2, &BIT_2, "Merge", h); ASSERT_STR_EQ(h, COMMIT_M);
}
TEST(commit_parent_order_matters) {
    const char *p[] = { COMMIT_2, COMMIT_1 };
    char h[MG_HEX_SIZE]; commit_hex(TREE_TWO, p, 2, &BIT_2, "Merge", h);
    ASSERT_TRUE(strcmp(h, COMMIT_M) != 0);
}
TEST(commit_message_newline_not_doubled) {
    char a[MG_HEX_SIZE], b[MG_HEX_SIZE];
    commit_hex(TREE_HELLO, NULL, 0, &BIT_1, "Primer commit", a);
    commit_hex(TREE_HELLO, NULL, 0, &BIT_1, "Primer commit\n", b);
    ASSERT_STR_EQ(a, b);
}
TEST(commit_date_changes_hash) {
    char a[MG_HEX_SIZE], b[MG_HEX_SIZE];
    commit_hex(TREE_HELLO, NULL, 0, &BIT_1, "Primer commit", a);
    commit_hex(TREE_HELLO, NULL, 0, &BIT_2, "Primer commit", b);
    ASSERT_TRUE(strcmp(a, b) != 0);   /* same files, one minute later: another commit */
}
TEST(commit_parse_round_trip) {
    const char *p[] = { COMMIT_1, COMMIT_2 };
    mg_buf body = {0}; mg_commit_body(&body, TREE_TWO, p, 2, &BIT_2, "Merge");
    char tree[MG_HEX_SIZE], parents[4][MG_HEX_SIZE]; size_t np = 0; const char *msg = NULL;
    ASSERT_EQ(mg_parse_commit(&body, tree, parents, 4, &np, &msg), 0);
    ASSERT_STR_EQ(tree, TREE_TWO); ASSERT_EQ(np, 2);
    ASSERT_STR_EQ(parents[0], COMMIT_1); ASSERT_STR_EQ(parents[1], COMMIT_2);
    ASSERT_STR_EQ(msg, "Merge\n");
    mg_buf_free(&body);
}

/* ── The object store on disk ────────────────────────────────────────── */

TEST(init_points_head_to_main) {
    sandbox_t s; sandbox_open(&s);
    char branch[MG_NAME_MAX];
    ASSERT_EQ(mg_head_branch(s.git, branch, sizeof branch), 0);
    ASSERT_STR_EQ(branch, "main");
    rm_rf(s.root);
}
TEST(write_then_read_blob) {
    sandbox_t s; sandbox_open(&s);
    char hex[MG_HEX_SIZE], type[MG_TYPE_MAX]; mg_buf body = {0};
    ASSERT_EQ(mg_write_object(s.git, "blob", (const unsigned char *)"hello\n", 6, hex), 0);
    ASSERT_STR_EQ(hex, HELLO_BLOB);
    ASSERT_EQ(mg_read_object(s.git, hex, type, &body), 0);
    ASSERT_STR_EQ(type, "blob"); ASSERT_EQ(body.len, 6); ASSERT_STR_EQ((const char *)body.data, "hello\n");
    mg_buf_free(&body); rm_rf(s.root);
}
TEST(object_lives_in_two_char_folder) {
    sandbox_t s; sandbox_open(&s);
    char hex[MG_HEX_SIZE], path[512];
    mg_write_object(s.git, "blob", (const unsigned char *)"hello\n", 6, hex);
    snprintf(path, sizeof path, "%s/objects/ce/013625030ba8dba906f756967f9e9ca394464a", s.git);
    struct stat st;
    ASSERT_EQ(stat(path, &st), 0);
    ASSERT_EQ((long)st.st_size, (long)(strlen("blob 6") + 1 + 6));   /* header, '\0', body: no compression */
    rm_rf(s.root);
}
TEST(writing_twice_is_harmless) {
    sandbox_t s; sandbox_open(&s);
    char a[MG_HEX_SIZE], b[MG_HEX_SIZE];
    ASSERT_EQ(mg_write_object(s.git, "blob", (const unsigned char *)"x\n", 2, a), 0);
    ASSERT_EQ(mg_write_object(s.git, "blob", (const unsigned char *)"x\n", 2, b), 0);
    ASSERT_STR_EQ(a, b);
    rm_rf(s.root);
}
TEST(corrupted_object_is_rejected) {
    sandbox_t s; sandbox_open(&s);
    char hex[MG_HEX_SIZE], type[MG_TYPE_MAX], path[512]; mg_buf body = {0};
    mg_write_object(s.git, "blob", (const unsigned char *)"hello\n", 6, hex);
    snprintf(path, sizeof path, "%s/objects/ce/013625030ba8dba906f756967f9e9ca394464a", s.git);
    FILE *f = fopen(path, "wb"); fwrite("blob 6\0HELLO\n", 1, 13, f); fclose(f);
    ASSERT_EQ(mg_read_object(s.git, hex, type, &body), -1);
    mg_buf_free(&body); rm_rf(s.root);
}
TEST(missing_object_is_an_error) {
    sandbox_t s; sandbox_open(&s);
    char type[MG_TYPE_MAX]; mg_buf body = {0};
    ASSERT_EQ(mg_read_object(s.git, EMPTY_BLOB, type, &body), -1);
    mg_buf_free(&body); rm_rf(s.root);
}
TEST(short_hash_resolves) {
    sandbox_t s; sandbox_open(&s);
    char hex[MG_HEX_SIZE], found[MG_HEX_SIZE];
    mg_write_object(s.git, "blob", (const unsigned char *)"hello\n", 6, hex);
    ASSERT_EQ(mg_resolve_prefix(s.git, "ce01362", found), 0); ASSERT_STR_EQ(found, HELLO_BLOB);
    ASSERT_EQ(mg_resolve_prefix(s.git, "ce0", found), -1);      /* too short */
    ASSERT_EQ(mg_resolve_prefix(s.git, "ce02", found), -1);     /* no such object */
    ASSERT_EQ(mg_resolve_prefix(s.git, "zz01", found), -1);     /* not hex */
    rm_rf(s.root);
}

/* ── Refs ────────────────────────────────────────────────────────────── */

TEST(unborn_branch_has_no_commit) {
    sandbox_t s; sandbox_open(&s);
    char hex[MG_HEX_SIZE];
    ASSERT_EQ(mg_read_ref(s.git, "main", hex), 1);
    rm_rf(s.root);
}
TEST(branch_is_a_41_byte_file) {
    sandbox_t s; sandbox_open(&s);
    char hex[MG_HEX_SIZE], path[512];
    ASSERT_EQ(mg_update_ref(s.git, "main", COMMIT_1), 0);
    ASSERT_EQ(mg_read_ref(s.git, "main", hex), 0); ASSERT_STR_EQ(hex, COMMIT_1);
    snprintf(path, sizeof path, "%s/refs/heads/main", s.git);
    struct stat st; stat(path, &st);
    ASSERT_EQ((long)st.st_size, 41L);
    rm_rf(s.root);
}
TEST(bad_refs_are_refused) {
    sandbox_t s; sandbox_open(&s);
    ASSERT_EQ(mg_update_ref(s.git, "main", "not-a-hash"), -1);
    ASSERT_EQ(mg_update_ref(s.git, "../escape", COMMIT_1), -1);
    ASSERT_EQ(mg_update_ref(s.git, ".hidden", COMMIT_1), -1);
    rm_rf(s.root);
}

/* ── Snapshots of a folder ───────────────────────────────────────────── */

TEST(write_tree_of_a_folder_matches_git) {
    sandbox_t s; sandbox_open(&s);
    sandbox_file(&s, "hello.txt", "hello\n", 0);
    char hex[MG_HEX_SIZE];
    ASSERT_EQ(mg_write_tree(s.root, s.git, hex), 0); ASSERT_STR_EQ(hex, TREE_HELLO);
    sandbox_file(&s, "README.md", "# Proyecto\n", 0);
    ASSERT_EQ(mg_write_tree(s.root, s.git, hex), 0); ASSERT_STR_EQ(hex, TREE_TWO);
    rm_rf(s.root);
}
TEST(write_tree_ignores_hidden_files) {
    sandbox_t s; sandbox_open(&s);
    sandbox_file(&s, "hello.txt", "hello\n", 0);
    sandbox_file(&s, ".env", "SECRET=1\n", 0);
    char hex[MG_HEX_SIZE];
    ASSERT_EQ(mg_write_tree(s.root, s.git, hex), 0); ASSERT_STR_EQ(hex, TREE_HELLO);   /* neither .env nor .minigit */
    rm_rf(s.root);
}
TEST(write_tree_records_the_executable_bit) {
    sandbox_t s; sandbox_open(&s);
    sandbox_file(&s, "hello.txt", "hello\n", 1);
    char hex[MG_HEX_SIZE];
    ASSERT_EQ(mg_write_tree(s.root, s.git, hex), 0); ASSERT_STR_EQ(hex, TREE_EXEC);
    rm_rf(s.root);
}
TEST(history_on_disk_matches_git) {
    sandbox_t s; sandbox_open(&s);
    sandbox_file(&s, "hello.txt", "hello\n", 0);
    char tree[MG_HEX_SIZE], c1[MG_HEX_SIZE], c2[MG_HEX_SIZE];
    mg_write_tree(s.root, s.git, tree);
    mg_buf body = {0};
    mg_commit_body(&body, tree, NULL, 0, &BIT_1, "Primer commit");
    ASSERT_EQ(mg_write_object(s.git, "commit", body.data, body.len, c1), 0);
    mg_buf_free(&body);
    mg_update_ref(s.git, "main", c1);
    sandbox_file(&s, "README.md", "# Proyecto\n", 0);
    mg_write_tree(s.root, s.git, tree);
    const char *p[] = { c1 };
    mg_commit_body(&body, tree, p, 1, &BIT_2, "Agrega README");
    mg_write_object(s.git, "commit", body.data, body.len, c2);
    mg_buf_free(&body);
    mg_update_ref(s.git, "main", c2);
    ASSERT_STR_EQ(c1, COMMIT_1); ASSERT_STR_EQ(c2, COMMIT_2);
    /* walk back from the branch to the root, like git log */
    char hex[MG_HEX_SIZE], type[MG_TYPE_MAX], t[MG_HEX_SIZE], parents[2][MG_HEX_SIZE]; size_t np; const char *msg; int steps = 0;
    mg_read_ref(s.git, "main", hex);
    for (;;) {
        mg_buf b = {0};
        ASSERT_EQ(mg_read_object(s.git, hex, type, &b), 0);
        ASSERT_STR_EQ(type, "commit");
        ASSERT_EQ(mg_parse_commit(&b, t, parents, 2, &np, &msg), 0);
        mg_buf_free(&b);
        steps++;
        if (np == 0) break;
        memcpy(hex, parents[0], MG_HEX_SIZE);
    }
    ASSERT_EQ(steps, 2);
    rm_rf(s.root);
}

typedef struct { const char *name; void (*fn)(void); } test_entry_t;

int main(void) {
    const test_entry_t tests[] = {
        { "SHA-1 of the empty string", sha1_empty },
        { "SHA-1 of \"abc\"", sha1_abc },
        { "SHA-1 across two blocks", sha1_two_blocks },
        { "SHA-1 of the quick brown fox", sha1_fox },
        { "SHA-1 of a million 'a' fed in chunks", sha1_million_a },
        { "streaming SHA-1 equals one-shot at every split", sha1_streaming_matches_one_shot },
        { "padding boundaries (55, 56, 64 bytes)", sha1_padding_boundaries_differ },
        { "hex round trip", hex_round_trip },
        { "hex parser rejects bad input", hex_rejects_bad_input },
        { "empty blob matches Git", blob_empty },
        { "blob of \"hello\\n\" matches Git", blob_hello },
        { "README blob matches Git", blob_readme },
        { "blob with a NUL byte matches Git", blob_with_nul_byte },
        { "a blob hash is not the plain SHA-1 of the file", blob_is_not_the_plain_sha1 },
        { "empty tree matches Git", tree_empty },
        { "tree with one file matches Git", tree_one_file },
        { "tree with two files matches Git", tree_two_files },
        { "tree entries are sorted byte by byte", tree_sorts_by_bytes },
        { "executable files use mode 100755", tree_executable_mode },
        { "tree body parses back", tree_parse_round_trip },
        { "commit body is the exact text Git hashes", commit_body_text },
        { "root commit matches Git", commit_root },
        { "child commit matches Git", commit_child },
        { "merge commit with two parents matches Git", commit_merge_two_parents },
        { "the order of the parents is part of the hash", commit_parent_order_matters },
        { "a trailing newline in the message is not doubled", commit_message_newline_not_doubled },
        { "the date is part of the hash", commit_date_changes_hash },
        { "commit body parses back", commit_parse_round_trip },
        { "init points HEAD to main", init_points_head_to_main },
        { "write a blob and read it back", write_then_read_blob },
        { "objects live in objects/xx/ without compression", object_lives_in_two_char_folder },
        { "writing the same object twice is harmless", writing_twice_is_harmless },
        { "a corrupted object is rejected", corrupted_object_is_rejected },
        { "a missing object is an error", missing_object_is_an_error },
        { "short hashes resolve (4+ characters)", short_hash_resolves },
        { "an unborn branch has no commit", unborn_branch_has_no_commit },
        { "a branch is a 41-byte file", branch_is_a_41_byte_file },
        { "bad refs are refused", bad_refs_are_refused },
        { "write-tree of a folder matches Git", write_tree_of_a_folder_matches_git },
        { "write-tree ignores hidden files", write_tree_ignores_hidden_files },
        { "write-tree records the executable bit", write_tree_records_the_executable_bit },
        { "a two-commit history on disk matches Git", history_on_disk_matches_git },
    };
    size_t n = sizeof tests / sizeof tests[0];
    char title[64];
    snprintf(title, sizeof title, "minigit: Git Objects in C (%zu Tests)", n);
    test_suite_begin(title);
    for (size_t i = 0; i < n; i++) {
        test_case_begin(tests[i].name);
        tests[i].fn();
        test_case_end();
    }
    return test_suite_summary();
}
