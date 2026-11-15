/**
 * minigit - Git's object model: hashing, storing and reading blobs, trees and commits.
 * Return values: 0 on success, -1 on error (other values are documented per function).
 */
#define _POSIX_C_SOURCE 200809L

#include "minigit.h"
#include "sha1.h"

#include <dirent.h>
#include <errno.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>

/* ── Buffers ─────────────────────────────────────────────────────────── */

int mg_buf_add(mg_buf *b, const void *data, size_t len) {
    if (b->len + len + 1 > b->cap) {
        size_t cap = b->cap ? b->cap : 256;
        while (b->len + len + 1 > cap) cap *= 2;
        unsigned char *p = realloc(b->data, cap);
        if (!p) return -1;
        b->data = p;
        b->cap = cap;
    }
    if (len) memcpy(b->data + b->len, data, len);
    b->len += len;
    b->data[b->len] = '\0';   /* always printable as a C string */
    return 0;
}

void mg_buf_free(mg_buf *b) {
    free(b->data);
    b->data = NULL;
    b->len = b->cap = 0;
}

static int buf_printf(mg_buf *b, const char *fmt, ...) {
    char line[512];
    va_list ap;
    va_start(ap, fmt);
    int n = vsnprintf(line, sizeof line, fmt, ap);
    va_end(ap);
    if (n < 0 || (size_t)n >= sizeof line) return -1;
    return mg_buf_add(b, line, (size_t)n);
}

/* ── Hashes ──────────────────────────────────────────────────────────── */

void mg_to_hex(const unsigned char digest[20], char hex[MG_HEX_SIZE]) {
    static const char digits[] = "0123456789abcdef";
    for (int i = 0; i < 20; i++) {
        hex[i * 2] = digits[digest[i] >> 4];
        hex[i * 2 + 1] = digits[digest[i] & 15];
    }
    hex[40] = '\0';
}

static int hex_value(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    return -1;
}

int mg_from_hex(const char *hex, unsigned char digest[20]) {
    if (strlen(hex) != 40) return -1;
    for (int i = 0; i < 20; i++) {
        int hi = hex_value(hex[i * 2]), lo = hex_value(hex[i * 2 + 1]);
        if (hi < 0 || lo < 0) return -1;
        digest[i] = (unsigned char)(hi << 4 | lo);
    }
    return 0;
}

/* The name of an object is the SHA-1 of its header plus its body */
void mg_hash_object(const char *type, const unsigned char *body, size_t len, char hex[MG_HEX_SIZE]) {
    char header[32];
    int n = snprintf(header, sizeof header, "%s %zu", type, len);
    mg_sha1_ctx ctx;
    mg_sha1_init(&ctx);
    mg_sha1_update(&ctx, header, (size_t)n + 1);   /* the '\0' is part of the header */
    mg_sha1_update(&ctx, body, len);
    unsigned char digest[20];
    mg_sha1_final(&ctx, digest);
    mg_to_hex(digest, hex);
}

/* ── Trees ───────────────────────────────────────────────────────────── */

static int by_name(const void *a, const void *b) {
    return strcmp(((const mg_entry *)a)->name, ((const mg_entry *)b)->name);
}

/* A tree lists its files sorted by name: "<mode> <name>\0" and the 20 raw bytes of the hash */
int mg_tree_body(mg_entry *entries, size_t n, mg_buf *out) {
    qsort(entries, n, sizeof *entries, by_name);
    for (size_t i = 0; i < n; i++) {
        unsigned char raw[20];
        if (mg_from_hex(entries[i].hex, raw) != 0) return -1;
        if (buf_printf(out, "%s %s", entries[i].mode, entries[i].name) != 0) return -1;   /* mode, space, name */
        if (mg_buf_add(out, "", 1) != 0) return -1;   /* the '\0' after the name */
        if (mg_buf_add(out, raw, 20) != 0) return -1;
    }
    return 0;
}

int mg_parse_tree(const mg_buf *body, mg_entry *entries, size_t max, size_t *n) {
    size_t at = 0;
    *n = 0;
    while (at < body->len) {
        const unsigned char *space = memchr(body->data + at, ' ', body->len - at);
        if (!space) return -1;
        const unsigned char *nul = memchr(space, '\0', body->len - (size_t)(space - body->data));
        if (!nul || (size_t)(nul - body->data) + 21 > body->len || *n == max) return -1;
        size_t mode_len = (size_t)(space - (body->data + at));
        size_t name_len = (size_t)(nul - space - 1);
        if (mode_len >= sizeof entries[*n].mode || name_len >= MG_NAME_MAX) return -1;
        memcpy(entries[*n].mode, body->data + at, mode_len);
        entries[*n].mode[mode_len] = '\0';
        memcpy(entries[*n].name, space + 1, name_len);
        entries[*n].name[name_len] = '\0';
        mg_to_hex(nul + 1, entries[*n].hex);
        (*n)++;
        at = (size_t)(nul - body->data) + 21;
    }
    return 0;
}

/* ── Commits ─────────────────────────────────────────────────────────── */

/* A commit is plain text: tree, parents, author, committer, a blank line and the message */
int mg_commit_body(mg_buf *out, const char *tree, const char *const *parents, size_t nparents,
                   const mg_signature *who, const char *message) {
    if (buf_printf(out, "tree %s\n", tree) != 0) return -1;
    for (size_t i = 0; i < nparents; i++) {
        if (buf_printf(out, "parent %s\n", parents[i]) != 0) return -1;
    }
    const char *roles[] = { "author", "committer" };
    for (int r = 0; r < 2; r++) {
        if (buf_printf(out, "%s %s <%s> %lld %s\n", roles[r], who->name, who->email, who->when, who->tz) != 0) return -1;
    }
    if (mg_buf_add(out, "\n", 1) != 0 || mg_buf_add(out, message, strlen(message)) != 0) return -1;
    size_t len = strlen(message);
    if (len == 0 || message[len - 1] != '\n') return mg_buf_add(out, "\n", 1);
    return 0;
}

int mg_parse_commit(const mg_buf *body, char tree[MG_HEX_SIZE], char parents[][MG_HEX_SIZE],
                    size_t max_parents, size_t *nparents, const char **message) {
    const char *text = (const char *)body->data;
    const char *end = text + body->len;
    *nparents = 0;
    tree[0] = '\0';
    while (text < end && *text != '\n') {
        const char *eol = memchr(text, '\n', (size_t)(end - text));
        if (!eol) return -1;
        if (strncmp(text, "tree ", 5) == 0 && eol - text == 45) {
            memcpy(tree, text + 5, 40);
            tree[40] = '\0';
        } else if (strncmp(text, "parent ", 7) == 0 && eol - text == 47) {
            if (*nparents == max_parents) return -1;
            memcpy(parents[*nparents], text + 7, 40);
            parents[(*nparents)++][40] = '\0';
        }
        text = eol + 1;
    }
    if (text >= end || tree[0] == '\0') return -1;
    *message = text + 1;
    return 0;
}

/* ── Repository on disk ──────────────────────────────────────────────── */

static int make_dir(const char *path) {
    return mkdir(path, 0755) == 0 || errno == EEXIST ? 0 : -1;
}

static int write_file(const char *path, const void *data, size_t len) {
    FILE *f = fopen(path, "wb");
    if (!f) return -1;
    int ok = fwrite(data, 1, len, f) == len;
    return fclose(f) == 0 && ok ? 0 : -1;
}

static int read_file(const char *path, mg_buf *out) {
    FILE *f = fopen(path, "rb");
    if (!f) return -1;
    unsigned char chunk[4096];
    size_t n;
    int rc = 0;
    while ((n = fread(chunk, 1, sizeof chunk, f)) > 0) {
        if (mg_buf_add(out, chunk, n) != 0) { rc = -1; break; }
    }
    if (ferror(f)) rc = -1;
    fclose(f);
    if (rc == 0 && !out->data) rc = mg_buf_add(out, "", 0);   /* empty file: still a valid buffer */
    return rc;
}

int mg_init(const char *gitdir) {
    char path[1024];
    if (make_dir(gitdir) != 0) return -1;
    snprintf(path, sizeof path, "%s/objects", gitdir);
    if (make_dir(path) != 0) return -1;
    snprintf(path, sizeof path, "%s/refs", gitdir);
    if (make_dir(path) != 0) return -1;
    snprintf(path, sizeof path, "%s/refs/heads", gitdir);
    if (make_dir(path) != 0) return -1;
    snprintf(path, sizeof path, "%s/HEAD", gitdir);
    const char *head = "ref: refs/heads/main\n";
    return write_file(path, head, strlen(head));
}

static void object_path(const char *gitdir, const char *hex, char *dir, char *file, size_t cap) {
    snprintf(dir, cap, "%s/objects/%.2s", gitdir, hex);
    snprintf(file, cap, "%s/objects/%.2s/%s", gitdir, hex, hex + 2);
}

int mg_write_object(const char *gitdir, const char *type, const unsigned char *body, size_t len,
                    char hex[MG_HEX_SIZE]) {
    mg_hash_object(type, body, len, hex);
    char dir[1024], file[1024];
    object_path(gitdir, hex, dir, file, sizeof dir);
    struct stat st;
    if (stat(file, &st) == 0) return 0;   /* same content, same name: already stored */
    if (make_dir(dir) != 0) return -1;
    mg_buf all = {0};
    char header[32];
    int n = snprintf(header, sizeof header, "%s %zu", type, len);
    int rc = mg_buf_add(&all, header, (size_t)n + 1) == 0 && mg_buf_add(&all, body, len) == 0
        ? write_file(file, all.data, all.len) : -1;
    mg_buf_free(&all);
    return rc;
}

int mg_read_object(const char *gitdir, const char *hex, char type[MG_TYPE_MAX], mg_buf *body) {
    char dir[1024], file[1024];
    if (strlen(hex) != 40) return -1;
    object_path(gitdir, hex, dir, file, sizeof dir);
    mg_buf raw = {0};
    if (read_file(file, &raw) != 0) { mg_buf_free(&raw); return -1; }
    const unsigned char *nul = memchr(raw.data, '\0', raw.len);
    const unsigned char *space = memchr(raw.data, ' ', raw.len);
    int rc = -1;
    if (nul && space && space < nul && (size_t)(space - raw.data) < MG_TYPE_MAX) {
        size_t type_len = (size_t)(space - raw.data);
        memcpy(type, raw.data, type_len);
        type[type_len] = '\0';
        size_t size = strtoul((const char *)space + 1, NULL, 10);
        size_t body_len = raw.len - (size_t)(nul - raw.data) - 1;
        if (size == body_len) {
            body->len = 0;
            rc = mg_buf_add(body, nul + 1, body_len);
            char check[MG_HEX_SIZE];
            mg_hash_object(type, body->data, body->len, check);
            if (rc == 0 && strcmp(check, hex) != 0) rc = -1;   /* corrupted object */
        }
    }
    mg_buf_free(&raw);
    return rc;
}

/* 0: found, -1: no object starts with that prefix (or it is too short), -2: ambiguous */
int mg_resolve_prefix(const char *gitdir, const char *prefix, char hex[MG_HEX_SIZE]) {
    size_t len = strlen(prefix);
    if (len < 4 || len > 40) return -1;
    for (size_t i = 0; i < len; i++) if (hex_value(prefix[i]) < 0) return -1;
    char dir[1024];
    snprintf(dir, sizeof dir, "%s/objects/%.2s", gitdir, prefix);
    DIR *d = opendir(dir);
    if (!d) return -1;
    int found = 0;
    struct dirent *e;
    while ((e = readdir(d)) != NULL) {
        if (strlen(e->d_name) != 38 || strncmp(e->d_name, prefix + 2, len - 2) != 0) continue;
        if (++found > 1) break;
        snprintf(hex, MG_HEX_SIZE, "%.2s%s", prefix, e->d_name);
    }
    closedir(d);
    return found == 1 ? 0 : found == 0 ? -1 : -2;
}

int mg_head_branch(const char *gitdir, char *branch, size_t cap) {
    char path[1024];
    snprintf(path, sizeof path, "%s/HEAD", gitdir);
    mg_buf head = {0};
    if (read_file(path, &head) != 0) { mg_buf_free(&head); return -1; }
    const char *prefix = "ref: refs/heads/";
    int rc = -1;
    if (head.len > strlen(prefix) && strncmp((char *)head.data, prefix, strlen(prefix)) == 0) {
        size_t n = strcspn((char *)head.data + strlen(prefix), "\n");
        if (n > 0 && n < cap) {
            memcpy(branch, head.data + strlen(prefix), n);
            branch[n] = '\0';
            rc = 0;
        }
    }
    mg_buf_free(&head);
    return rc;
}

static int valid_branch(const char *branch) {
    size_t n = strlen(branch);
    return n > 0 && n < MG_NAME_MAX && branch[0] != '.' && !strchr(branch, '/') && !strstr(branch, "..");
}

/* 0: the branch points to a commit, 1: the branch has no commits yet, -1: error */
int mg_read_ref(const char *gitdir, const char *branch, char hex[MG_HEX_SIZE]) {
    if (!valid_branch(branch)) return -1;
    char path[1024];
    snprintf(path, sizeof path, "%s/refs/heads/%s", gitdir, branch);
    mg_buf ref = {0};
    if (read_file(path, &ref) != 0) { mg_buf_free(&ref); return 1; }
    int rc = -1;
    unsigned char raw[20];
    if (ref.len >= 40) {
        memcpy(hex, ref.data, 40);
        hex[40] = '\0';
        rc = mg_from_hex(hex, raw) == 0 ? 0 : -1;
    }
    mg_buf_free(&ref);
    return rc;
}

/* A branch is a 41-byte file: the hash of a commit and a newline */
int mg_update_ref(const char *gitdir, const char *branch, const char *hex) {
    unsigned char raw[20];
    if (!valid_branch(branch) || mg_from_hex(hex, raw) != 0) return -1;
    char path[1024], line[MG_HEX_SIZE + 1];
    snprintf(path, sizeof path, "%s/refs/heads/%s", gitdir, branch);
    snprintf(line, sizeof line, "%s\n", hex);
    return write_file(path, line, 41);
}

/* Snapshot of the regular files in workdir (no folders), like "git add . && git write-tree" */
int mg_write_tree(const char *workdir, const char *gitdir, char hex[MG_HEX_SIZE]) {
    DIR *d = opendir(workdir);
    if (!d) return -1;
    size_t n = 0, cap = 16;
    mg_entry *entries = malloc(cap * sizeof *entries);
    int rc = entries ? 0 : -1;
    struct dirent *e;
    while (rc == 0 && (e = readdir(d)) != NULL) {
        if (e->d_name[0] == '.' || strlen(e->d_name) >= MG_NAME_MAX) continue;   /* skips .minigit too */
        char path[2048];
        snprintf(path, sizeof path, "%s/%s", workdir, e->d_name);
        struct stat st;
        if (stat(path, &st) != 0 || !S_ISREG(st.st_mode)) continue;
        if (n == cap) {
            mg_entry *more = realloc(entries, (cap *= 2) * sizeof *entries);
            if (!more) { rc = -1; break; }
            entries = more;
        }
        mg_buf content = {0};
        if (read_file(path, &content) != 0) { mg_buf_free(&content); rc = -1; break; }
        rc = mg_write_object(gitdir, "blob", content.data, content.len, entries[n].hex);
        mg_buf_free(&content);
        strcpy(entries[n].mode, (st.st_mode & S_IXUSR) ? "100755" : "100644");
        snprintf(entries[n].name, MG_NAME_MAX, "%s", e->d_name);
        n++;
    }
    closedir(d);
    mg_buf body = {0};
    if (rc == 0) rc = mg_tree_body(entries, n, &body);
    if (rc == 0) rc = mg_write_object(gitdir, "tree", body.data ? body.data : (const unsigned char *)"", body.len, hex);
    mg_buf_free(&body);
    free(entries);
    return rc;
}
