/**
 * minigit - SHA-1 (FIPS 180-4), the hash Git uses to name its objects.
 * Streaming interface: init, update as many times as needed, final.
 */
#ifndef MINIGIT_SHA1_H
#define MINIGIT_SHA1_H

#include <stddef.h>
#include <stdint.h>

typedef struct {
    uint32_t h[5];            /* running hash state */
    uint64_t length;          /* bytes hashed so far */
    unsigned char block[64];  /* bytes waiting for a full 64-byte block */
    size_t used;
} mg_sha1_ctx;

void mg_sha1_init(mg_sha1_ctx *ctx);
void mg_sha1_update(mg_sha1_ctx *ctx, const void *data, size_t len);
void mg_sha1_final(mg_sha1_ctx *ctx, unsigned char digest[20]);
void mg_sha1(const void *data, size_t len, unsigned char digest[20]);

#endif /* MINIGIT_SHA1_H */
