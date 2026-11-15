/**
 * minigit - SHA-1 (FIPS 180-4).
 */
#include "sha1.h"

#include <string.h>

#define ROTL(x, n) (((x) << (n)) | ((x) >> (32 - (n))))

static void sha1_block(mg_sha1_ctx *ctx, const unsigned char *p) {
    uint32_t w[80];
    for (int i = 0; i < 16; i++) {
        w[i] = (uint32_t)p[i * 4] << 24 | (uint32_t)p[i * 4 + 1] << 16 | (uint32_t)p[i * 4 + 2] << 8 | (uint32_t)p[i * 4 + 3];
    }
    for (int i = 16; i < 80; i++) w[i] = ROTL(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);

    uint32_t a = ctx->h[0], b = ctx->h[1], c = ctx->h[2], d = ctx->h[3], e = ctx->h[4];
    for (int i = 0; i < 80; i++) {
        uint32_t f, k;
        if (i < 20)      { f = (b & c) | (~b & d);          k = 0x5A827999u; }
        else if (i < 40) { f = b ^ c ^ d;                   k = 0x6ED9EBA1u; }
        else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDCu; }
        else             { f = b ^ c ^ d;                   k = 0xCA62C1D6u; }
        uint32_t t = ROTL(a, 5) + f + e + k + w[i];
        e = d; d = c; c = ROTL(b, 30); b = a; a = t;
    }
    ctx->h[0] += a; ctx->h[1] += b; ctx->h[2] += c; ctx->h[3] += d; ctx->h[4] += e;
}

void mg_sha1_init(mg_sha1_ctx *ctx) {
    ctx->h[0] = 0x67452301u;
    ctx->h[1] = 0xEFCDAB89u;
    ctx->h[2] = 0x98BADCFEu;
    ctx->h[3] = 0x10325476u;
    ctx->h[4] = 0xC3D2E1F0u;
    ctx->length = 0;
    ctx->used = 0;
}

void mg_sha1_update(mg_sha1_ctx *ctx, const void *data, size_t len) {
    const unsigned char *p = (const unsigned char *)data;
    ctx->length += len;
    while (len > 0) {
        size_t take = 64 - ctx->used;
        if (take > len) take = len;
        memcpy(ctx->block + ctx->used, p, take);
        ctx->used += take;
        p += take;
        len -= take;
        if (ctx->used == 64) {
            sha1_block(ctx, ctx->block);
            ctx->used = 0;
        }
    }
}

void mg_sha1_final(mg_sha1_ctx *ctx, unsigned char digest[20]) {
    uint64_t bits = ctx->length * 8;
    unsigned char pad = 0x80;
    mg_sha1_update(ctx, &pad, 1);
    unsigned char zero = 0;
    while (ctx->used != 56) mg_sha1_update(ctx, &zero, 1);
    unsigned char len_be[8];
    for (int i = 0; i < 8; i++) len_be[i] = (unsigned char)(bits >> (56 - 8 * i));
    mg_sha1_update(ctx, len_be, 8);
    for (int i = 0; i < 5; i++) {
        digest[i * 4]     = (unsigned char)(ctx->h[i] >> 24);
        digest[i * 4 + 1] = (unsigned char)(ctx->h[i] >> 16);
        digest[i * 4 + 2] = (unsigned char)(ctx->h[i] >> 8);
        digest[i * 4 + 3] = (unsigned char)(ctx->h[i]);
    }
}

void mg_sha1(const void *data, size_t len, unsigned char digest[20]) {
    mg_sha1_ctx ctx;
    mg_sha1_init(&ctx);
    mg_sha1_update(&ctx, data, len);
    mg_sha1_final(&ctx, digest);
}
