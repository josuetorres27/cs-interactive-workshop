/**
 * minigit - command line.
 *
 *   minigit init                         create .minigit in the current folder
 *   minigit hash-object [-w] <file>      hash a file as a blob (-w also stores it)
 *   minigit cat-file (-t|-s|-p) <hash>   show an object's type, size or content
 *   minigit write-tree                   store a tree with the files of this folder
 *   minigit commit-tree <tree> [-p <parent>]... -m <msg>
 *   minigit commit -m <msg>              write-tree + commit-tree + move the branch
 *   minigit log                          follow the first parents from HEAD
 *   minigit rev-parse <HEAD|branch|hash>
 *
 * The author and date come from MINIGIT_AUTHOR_NAME, MINIGIT_AUTHOR_EMAIL and
 * MINIGIT_AUTHOR_DATE ("1767290400 -0600"); with the same values, Git prints the same hashes.
 */
#define _POSIX_C_SOURCE 200809L

#include "minigit.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define GITDIR ".minigit"
#define MAX_PARENTS 8

static int fail(const char *msg, const char *arg) {
    fprintf(stderr, "fatal: %s%s\n", msg, arg ? arg : "");
    return 1;
}

static mg_signature signature(char *when_buf, size_t cap) {
    mg_signature who;
    const char *name = getenv("MINIGIT_AUTHOR_NAME");
    const char *email = getenv("MINIGIT_AUTHOR_EMAIL");
    const char *date = getenv("MINIGIT_AUTHOR_DATE");
    who.name = name && *name ? name : "Bit";
    who.email = email && *email ? email : "bit@taller.local";
    who.when = (long long)time(NULL);
    who.tz = "+0000";
    if (date && *date) {
        snprintf(when_buf, cap, "%s", date);
        char *space = strchr(when_buf, ' ');
        who.when = atoll(when_buf);
        if (space) who.tz = space + 1;
    }
    return who;
}

/* HEAD, a branch name or a hash (or a prefix of 4+ characters) */
static int resolve(const char *rev, char hex[MG_HEX_SIZE]) {
    char branch[MG_NAME_MAX];
    if (strcmp(rev, "HEAD") == 0) {
        if (mg_head_branch(GITDIR, branch, sizeof branch) != 0) return -1;
        return mg_read_ref(GITDIR, branch, hex) == 0 ? 0 : -1;
    }
    if (mg_read_ref(GITDIR, rev, hex) == 0) return 0;
    return mg_resolve_prefix(GITDIR, rev, hex);
}

static int read_file(const char *path, mg_buf *out) {
    FILE *f = fopen(path, "rb");
    if (!f) return -1;
    unsigned char chunk[4096];
    size_t n;
    while ((n = fread(chunk, 1, sizeof chunk, f)) > 0) mg_buf_add(out, chunk, n);
    fclose(f);
    return out->data ? 0 : mg_buf_add(out, "", 0);
}

static int cmd_hash_object(int argc, char **argv) {
    int write = argc > 2 && strcmp(argv[2], "-w") == 0;
    const char *path = argv[write ? 3 : 2];
    if (!path) return fail("usage: minigit hash-object [-w] <file>", NULL);
    mg_buf content = {0};
    if (read_file(path, &content) != 0) return fail("could not read ", path);
    char hex[MG_HEX_SIZE];
    int rc = 0;
    if (write) rc = mg_write_object(GITDIR, "blob", content.data, content.len, hex);
    else mg_hash_object("blob", content.data, content.len, hex);
    mg_buf_free(&content);
    if (rc != 0) return fail("could not write the object (run minigit init first)", NULL);
    printf("%s\n", hex);
    return 0;
}

static int cmd_cat_file(int argc, char **argv) {
    if (argc < 4) return fail("usage: minigit cat-file (-t|-s|-p) <object>", NULL);
    char hex[MG_HEX_SIZE], type[MG_TYPE_MAX];
    if (resolve(argv[3], hex) != 0) return fail("not a valid object name ", argv[3]);
    mg_buf body = {0};
    if (mg_read_object(GITDIR, hex, type, &body) != 0) return fail("could not read object ", hex);
    if (strcmp(argv[2], "-t") == 0) printf("%s\n", type);
    else if (strcmp(argv[2], "-s") == 0) printf("%zu\n", body.len);
    else if (strcmp(type, "tree") == 0) {
        mg_entry entries[256];
        size_t n;
        if (mg_parse_tree(&body, entries, 256, &n) != 0) { mg_buf_free(&body); return fail("corrupt tree ", hex); }
        for (size_t i = 0; i < n; i++) printf("%s blob %s\t%s\n", entries[i].mode, entries[i].hex, entries[i].name);
    } else fwrite(body.data, 1, body.len, stdout);
    mg_buf_free(&body);
    return 0;
}

static int write_commit(const char *tree, const char *const *parents, size_t np, const char *msg, char hex[MG_HEX_SIZE]) {
    char when[64];
    mg_signature who = signature(when, sizeof when);
    mg_buf body = {0};
    int rc = mg_commit_body(&body, tree, parents, np, &who, msg);
    if (rc == 0) rc = mg_write_object(GITDIR, "commit", body.data, body.len, hex);
    mg_buf_free(&body);
    return rc;
}

static int cmd_commit_tree(int argc, char **argv) {
    const char *parents[MAX_PARENTS];
    char parent_hex[MAX_PARENTS][MG_HEX_SIZE];
    size_t np = 0;
    const char *msg = NULL;
    char tree[MG_HEX_SIZE];
    if (argc < 3 || resolve(argv[2], tree) != 0) return fail("usage: minigit commit-tree <tree> [-p <parent>]... -m <msg>", NULL);
    for (int i = 3; i < argc; i++) {
        if (strcmp(argv[i], "-p") == 0 && i + 1 < argc && np < MAX_PARENTS) {
            if (resolve(argv[++i], parent_hex[np]) != 0) return fail("not a valid commit ", argv[i]);
            parents[np] = parent_hex[np];
            np++;
        } else if (strcmp(argv[i], "-m") == 0 && i + 1 < argc) msg = argv[++i];
    }
    if (!msg) return fail("a commit needs a message: -m \"...\"", NULL);
    char hex[MG_HEX_SIZE];
    if (write_commit(tree, parents, np, msg, hex) != 0) return fail("could not write the commit", NULL);
    printf("%s\n", hex);
    return 0;
}

static int cmd_commit(int argc, char **argv) {
    const char *msg = argc > 3 && strcmp(argv[2], "-m") == 0 ? argv[3] : NULL;
    if (!msg) return fail("usage: minigit commit -m <msg>", NULL);
    char branch[MG_NAME_MAX], tree[MG_HEX_SIZE], parent[MG_HEX_SIZE], hex[MG_HEX_SIZE];
    if (mg_head_branch(GITDIR, branch, sizeof branch) != 0) return fail("not a minigit repository (run minigit init)", NULL);
    if (mg_write_tree(".", GITDIR, tree) != 0) return fail("could not write the tree", NULL);
    int has_parent = mg_read_ref(GITDIR, branch, parent) == 0;
    if (has_parent) {
        char type[MG_TYPE_MAX], parent_tree[MG_HEX_SIZE], grand[MAX_PARENTS][MG_HEX_SIZE];
        size_t ng;
        const char *old_msg;
        mg_buf body = {0};
        int same = mg_read_object(GITDIR, parent, type, &body) == 0
            && mg_parse_commit(&body, parent_tree, grand, MAX_PARENTS, &ng, &old_msg) == 0
            && strcmp(parent_tree, tree) == 0;
        mg_buf_free(&body);
        if (same) { printf("nothing to commit, working tree clean\n"); return 1; }
    }
    const char *parents[1] = { parent };
    if (write_commit(tree, parents, has_parent ? 1 : 0, msg, hex) != 0) return fail("could not write the commit", NULL);
    if (mg_update_ref(GITDIR, branch, hex) != 0) return fail("could not move the branch ", branch);
    printf("[%s%s %.7s] %s\n", branch, has_parent ? "" : " (root-commit)", hex, msg);
    return 0;
}

static int cmd_log(void) {
    char hex[MG_HEX_SIZE];
    if (resolve("HEAD", hex) != 0) return fail("your current branch does not have any commits yet", NULL);
    for (;;) {
        char type[MG_TYPE_MAX], tree[MG_HEX_SIZE], parents[MAX_PARENTS][MG_HEX_SIZE];
        size_t np;
        const char *msg;
        mg_buf body = {0};
        if (mg_read_object(GITDIR, hex, type, &body) != 0 || mg_parse_commit(&body, tree, parents, MAX_PARENTS, &np, &msg) != 0) {
            mg_buf_free(&body);
            return fail("could not read commit ", hex);
        }
        const char *author = strstr((const char *)body.data, "\nauthor ");
        printf("commit %s\n", hex);
        if (author) printf("Author: %.*s\n", (int)strcspn(author + 8, "\n"), author + 8);
        printf("\n    %s\n", msg);
        mg_buf_free(&body);
        if (np == 0) return 0;
        memcpy(hex, parents[0], MG_HEX_SIZE);
    }
}

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "usage: minigit <init|hash-object|cat-file|write-tree|commit-tree|commit|log|rev-parse> ...\n");
        return 1;
    }
    const char *cmd = argv[1];
    if (strcmp(cmd, "init") == 0) {
        if (mg_init(GITDIR) != 0) return fail("could not create " GITDIR, NULL);
        printf("Initialized empty minigit repository in " GITDIR "/\n");
        return 0;
    }
    if (strcmp(cmd, "hash-object") == 0) return cmd_hash_object(argc, argv);
    if (strcmp(cmd, "cat-file") == 0) return cmd_cat_file(argc, argv);
    if (strcmp(cmd, "write-tree") == 0) {
        char hex[MG_HEX_SIZE];
        if (mg_write_tree(".", GITDIR, hex) != 0) return fail("could not write the tree (run minigit init first)", NULL);
        printf("%s\n", hex);
        return 0;
    }
    if (strcmp(cmd, "commit-tree") == 0) return cmd_commit_tree(argc, argv);
    if (strcmp(cmd, "commit") == 0) return cmd_commit(argc, argv);
    if (strcmp(cmd, "log") == 0) return cmd_log();
    if (strcmp(cmd, "rev-parse") == 0) {
        char hex[MG_HEX_SIZE];
        if (argc < 3 || resolve(argv[2], hex) != 0) return fail("unknown revision ", argc < 3 ? "" : argv[2]);
        printf("%s\n", hex);
        return 0;
    }
    return fail("unknown command ", cmd);
}
