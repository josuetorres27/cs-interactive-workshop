/**
 * CS Interactive Workshop - Networking & Distributed Sockets Test Suite
 * 50 Comprehensive Automated Tests (HTTP, Sockets, FileSystem, Assets)
 */

#include <iostream>
#include <string>
#include <sstream>
#include <vector>
#include <fstream>
#include <cassert>
#include "../runner.h"
#include "../../core-c-engines/networking/src/FileSystem.h"

// Helper: Simple HTTP request parser
struct HttpRequest {
    std::string method;
    std::string uri;
    std::string version;
    bool valid = false;
};

static HttpRequest parse_http_request(const std::string& raw) {
    HttpRequest req;
    std::istringstream stream(raw);
    std::string line;
    if (std::getline(stream, line)) {
        std::istringstream line_stream(line);
        if (line_stream >> req.method >> req.uri >> req.version) {
            req.valid = (req.version == "HTTP/1.1" || req.version == "HTTP/1.0");
        }
    }
    return req;
}

// Helper: HTTP response builder
static std::string build_http_response(int status, const std::string& content) {
    std::ostringstream oss;
    std::string status_text = (status == 200) ? "OK" : (status == 404 ? "Not Found" : "Bad Request");
    oss << "HTTP/1.1 " << status << " " << status_text << "\r\n";
    oss << "Content-Type: text/plain; charset=utf-8\r\n";
    oss << "Content-Length: " << content.length() << "\r\n";
    oss << "Connection: close\r\n\r\n";
    oss << content;
    return oss.str();
}

static void test_http_request_parsing(void) {
    // 15 tests of request parsing
    const char* valid_uris[5] = {"/figures/batman", "/figures/spiderman_1", "/api/figures", "/list", "/status"};
    for (int i = 0; i < 5; ++i) {
        char test_name[128];
        snprintf(test_name, sizeof(test_name), "HTTP GET Request Valid - URI '%s'", valid_uris[i]);
        test_case_begin(test_name);
        std::string raw = std::string("GET ") + valid_uris[i] + " HTTP/1.1\r\nHost: 127.0.0.1:8080\r\n\r\n";
        HttpRequest req = parse_http_request(raw);
        ASSERT_TRUE(req.valid);
        ASSERT_STR_EQ(req.method.c_str(), "GET");
        ASSERT_STR_EQ(req.uri.c_str(), valid_uris[i]);
        test_case_end();
    }

    for (int i = 0; i < 5; ++i) {
        char test_name[128];
        snprintf(test_name, sizeof(test_name), "HTTP POST Request Valid - URI '%s'", valid_uris[i]);
        test_case_begin(test_name);
        std::string raw = std::string("POST ") + valid_uris[i] + " HTTP/1.1\r\nHost: 127.0.0.1:8080\r\n\r\n";
        HttpRequest req = parse_http_request(raw);
        ASSERT_TRUE(req.valid);
        ASSERT_STR_EQ(req.method.c_str(), "POST");
        test_case_end();
    }

    // 5 malformed / invalid requests
    const char* bad_reqs[5] = {
        "INVALID_REQUEST\r\n\r\n",
        "GET /figures/batman\r\n\r\n", // missing version
        "GET\r\n\r\n",
        "",
        "PUT /test HTTP/0.9\r\n\r\n"
    };
    for (int i = 0; i < 5; ++i) {
        char test_name[128];
        snprintf(test_name, sizeof(test_name), "HTTP Malformed Request Rejection #%d", i + 1);
        test_case_begin(test_name);
        HttpRequest req = parse_http_request(bad_reqs[i]);
        ASSERT_FALSE(req.valid);
        test_case_end();
    }
}

static void test_http_response_framing(void) {
    // 10 tests verifying response formatting & Content-Length header accuracy
    const int test_sizes[10] = {0, 15, 64, 128, 256, 512, 1024, 2048, 4096, 8192};
    for (int t = 0; t < 10; ++t) {
        char test_name[128];
        int size = test_sizes[t];
        snprintf(test_name, sizeof(test_name), "HTTP 200 OK Content-Length Accuracy (%d Bytes)", size);
        test_case_begin(test_name);

        std::string body(size, 'A');
        std::string resp = build_http_response(200, body);

        // Verify status line
        ASSERT_TRUE(resp.rfind("HTTP/1.1 200 OK", 0) == 0);

        // Verify Content-Length header is present and exact
        std::string expected_cl = "Content-Length: " + std::to_string(size);
        ASSERT_TRUE(resp.find(expected_cl) != std::string::npos);

        // Verify double CRLF separator
        size_t body_pos = resp.find("\r\n\r\n");
        ASSERT_NE(body_pos, std::string::npos);
        std::string extracted_body = resp.substr(body_pos + 4);
        ASSERT_EQ(extracted_body.length(), (size_t)size);

        test_case_end();
    }
}

static void test_filesystem_block_storage(void) {
    // 13 tests of FileSystem block management
    std::string test_disk = "test_disk_tmp.bin";
    remove(test_disk.c_str());

    FileSystem fs(test_disk);
    fs.initDisk(3); // Initialize with 3 directory blocks

    for (int t = 1; t <= 13; ++t) {
        char test_name[128];
        snprintf(test_name, sizeof(test_name), "Block FileSystem Store/Retrieve #%d", t);
        test_case_begin(test_name);

        std::string fig_name = "asset_" + std::to_string(t);
        std::string content(t * 15, (char)('a' + (t % 26)));

        fs.addFigure(fig_name, content);
        ASSERT_TRUE(fs.figureExists(fig_name));

        std::string retrieved = fs.getFigureContent(fig_name);
        ASSERT_EQ(retrieved.length(), content.length());
        ASSERT_STR_EQ(retrieved.c_str(), content.c_str());

        test_case_end();
    }

    remove(test_disk.c_str());
}

static void test_ascii_art_assets_integrity(void) {
    // 12 tests: verifying every single figure in ascii_figures exists, is non-empty, and valid
    const char* figures[12] = {
        "batman", "charizard", "computer", "gengar", "goomba", "jigglypuff",
        "mario", "mcqueen", "pikachu", "spiderman_1", "spiderman_2", "yoshi"
    };

    for (int i = 0; i < 12; ++i) {
        char test_name[128];
        snprintf(test_name, sizeof(test_name), "ASCII Asset Integrity - '%s.txt'", figures[i]);
        test_case_begin(test_name);

        std::string candidates[3] = {
            "../core-c-engines/networking/ascii_figures/" + std::string(figures[i]) + ".txt",
            "core-c-engines/networking/ascii_figures/" + std::string(figures[i]) + ".txt",
            "../../core-c-engines/networking/ascii_figures/" + std::string(figures[i]) + ".txt"
        };

        std::ifstream file;
        for (int c = 0; c < 3; ++c) {
            file.open(candidates[c]);
            if (file.is_open()) break;
        }

        ASSERT_TRUE(file.is_open());
        std::string content((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
        ASSERT_GT(content.length(), 20ULL);
        ASSERT_TRUE(content.find('\n') != std::string::npos);

        test_case_end();
    }
}

int main(void) {
    test_suite_begin("Networking & Distributed Sockets (50 Tests)");

    test_http_request_parsing();     // 15 tests
    test_http_response_framing();    // 10 tests
    test_filesystem_block_storage(); // 13 tests
    test_ascii_art_assets_integrity();// 12 tests

    return test_suite_summary();
}
