/**
 * minigit - Git's object model in a few hundred lines of C11.
 *
 * Objects are stored the way Git stores them, minus the zlib compression:
 *   .minigit/objects/ab/cdef...   "<type> <size>\0<body>"
 * so every hash minigit prints is the hash real Git prints for the same content.
 *   blob   : the bytes of a file
 *   tree   : "<mode> <name>\0<20-byte hash>" per file, sorted by name
 *   commit : text with the tree, the parents, author, committer and message
 * Refs live in .minigit/refs/heads/<branch> and HEAD says which branch is current.
 */
#ifndef MINIGIT_H
#define MINIGIT_H

#include <stddef.h>

#define MG_HEX_SIZE 41   /* 40 hex digits + '\0' */
#define MG_NAME_MAX 64   /* longest file or branch name minigit accepts */
#define MG_TYPE_MAX 8    /* "commit" + '\0' fits */

typedef struct {
    unsigned char *data;
    size_t len;
    size_t cap;
} mg_buf;

typedef struct {
    const char *name;
    const char *email;
    long long when;      /* seconds since the epoch */
    const char *tz;      /* "-0600" */
} mg_signature;

typedef struct {
    char mode[8];        /* "100644" or "100755" */
    char name[MG_NAME_MAX];
    char hex[MG_HEX_SIZE];
} mg_entry;

/* Buffers */
int  mg_buf_add(mg_buf *b, const void *data, size_t len);
void mg_buf_free(mg_buf *b);

/* Hashes and object bodies (pure: no files involved) */
void mg_to_hex(const unsigned char digest[20], char hex[MG_HEX_SIZE]);
int  mg_from_hex(const char *hex, unsigned char digest[20]);
void mg_hash_object(const char *type, const unsigned char *body, size_t len, char hex[MG_HEX_SIZE]);
int  mg_tree_body(mg_entry *entries, size_t n, mg_buf *out);
int  mg_parse_tree(const mg_buf *body, mg_entry *entries, size_t max, size_t *n);
int  mg_commit_body(mg_buf *out, const char *tree, const char *const *parents, size_t nparents,
                    const mg_signature *who, const char *message);
int  mg_parse_commit(const mg_buf *body, char tree[MG_HEX_SIZE], char parents[][MG_HEX_SIZE],
                     size_t max_parents, size_t *nparents, const char **message);

/* Repository on disk */
int  mg_init(const char *gitdir);
int  mg_write_object(const char *gitdir, const char *type, const unsigned char *body, size_t len,
                     char hex[MG_HEX_SIZE]);
int  mg_read_object(const char *gitdir, const char *hex, char type[MG_TYPE_MAX], mg_buf *body);
int  mg_resolve_prefix(const char *gitdir, const char *prefix, char hex[MG_HEX_SIZE]);
int  mg_head_branch(const char *gitdir, char *branch, size_t cap);
int  mg_read_ref(const char *gitdir, const char *branch, char hex[MG_HEX_SIZE]);
int  mg_update_ref(const char *gitdir, const char *branch, const char *hex);
int  mg_write_tree(const char *workdir, const char *gitdir, char hex[MG_HEX_SIZE]);

#endif /* MINIGIT_H */
