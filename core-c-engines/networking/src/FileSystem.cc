/**
 * Distributed ASCII Art System
 * Module: FileSystem.cc
 *
 * Implementation of the custom block-based file system (block allocation, directory chaining, and data read/write).
 *
 * Author: Josue Torres
 * Copyright (c) 2025 Josue Torres
 * Licensed under the MIT License.
 */

#include "FileSystem.h"
#include <fstream>
#include <iostream>
#include <filesystem>
#include <cstring>

namespace fs = std::filesystem;

/**
 * Constructor for the FileSystem class, initializes the disk filename.
 *
 * @param diskFilename The filename of the disk (defaults to "disk.bin").
 */
FileSystem::FileSystem(const std::string& diskFilename)
  : diskFilename(diskFilename) {}

/**
 * Writes a block of data to the disk at a specified block number.
 *
 * @param blockNum The block number to write to.
 * @param data The data to write to the block.
 */
void FileSystem::writeBlock(int blockNum, const char* data) {
  std::fstream disk(diskFilename, std::ios::in | std::ios::out | std::ios::binary);
  disk.seekp(blockNum * BLOCK_SIZE);
  disk.write(data, BLOCK_SIZE);
  disk.close();
}

/**
 * Reads a block of data from the disk into a buffer.
 *
 * @param blockNum The block number to read from.
 * @param buffer The buffer to store the data.
 */
void FileSystem::readBlock(int blockNum, char* buffer) {
  std::ifstream disk(diskFilename, std::ios::binary);
  disk.seekg(blockNum * BLOCK_SIZE);
  disk.read(buffer, BLOCK_SIZE);
  disk.close();
}

/**
 * Retrieves the total number of blocks currently allocated in the disk.
 *
 * @return The number of blocks allocated on the disk.
 */
int FileSystem::getBlockCount() {
  std::ifstream disk(diskFilename, std::ios::binary | std::ios::ate);
  return static_cast<int>(disk.tellg()) / BLOCK_SIZE;
}

/**
 * Allocates a new block on the disk, writes an empty block to the disk, and
 * returns the block number.
 *
 * @return The block number of the newly allocated block.
 */
int FileSystem::allocateBlock() {
  std::ofstream disk(diskFilename, std::ios::in | std::ios::out | std::ios::binary);
  disk.seekp(nextFreeBlock * BLOCK_SIZE);
  char emptyBlock[BLOCK_SIZE] = {};  // Initialize with empty data
  disk.write(emptyBlock, BLOCK_SIZE);
  disk.close();
  return nextFreeBlock++;
}

/**
 * Initializes the disk by writing a specified number of empty directory blocks.
 *
 * @param numDirBlocks The number of directory blocks to allocate on the disk.
 */
void FileSystem::initDisk(int numDirBlocks) {
  std::ofstream disk(diskFilename, std::ios::binary);
  DirectoryBlock empty = {};  // Create an empty directory block
  for (int i = 0; i < numDirBlocks; ++i) {
    empty.nextBlock = (i == numDirBlocks - 1) ? 0 : i + 1;  // Set next block
    disk.write(reinterpret_cast<char*>(&empty), sizeof(empty));
  }
  disk.close();
  nextFreeBlock = numDirBlocks;  // Set the next available block
}

/**
 * Checks if a figure with the specified name exists in the directory.
 *
 * @param name The name of the figure to check.
 * @return true if the figure exists in the file system, false otherwise.
 */
bool FileSystem::figureExists(const std::string& name) {
  DirectoryBlock dir;
  int blockNum = 0;
  while (true) {
    readBlock(blockNum, reinterpret_cast<char*>(&dir));
    for (int i = 0; i < DIR_ENTRIES; ++i) {
      if (std::strncmp(dir.entries[i].name, name.c_str(), NAME_SIZE) == 0) {
        return true;  // Figure found
      }
    }
    if (dir.nextBlock == 0) break;  // No more directory blocks
    blockNum = dir.nextBlock;  // Move to the next block
  }
  return false;  // Figure not found
}

/**
 * Appends a new entry to the directory with the specified figure name and data block.
 * If the current directory block is full, a new directory block is allocated.
 *
 * @param name The name of the figure to add.
 * @param dataStartBlock The block where the figure's data starts.
 * @return The block number where the directory entry was added.
 */
int FileSystem::appendToDirectory(const std::string& name, int dataStartBlock) {
  DirectoryBlock dir;
  int blockNum = 0;

  while (true) {
    readBlock(blockNum, reinterpret_cast<char*>(&dir));

    // Find an empty entry in the directory block
    for (int i = 0; i < DIR_ENTRIES; ++i) {
      if (dir.entries[i].name[0] == '\0') {  // Empty entry
        std::strncpy(dir.entries[i].name, name.c_str(), NAME_SIZE);
        dir.entries[i].dataBlock = dataStartBlock;
        writeBlock(blockNum, reinterpret_cast<char*>(&dir));
        return blockNum;  // Return the current block number
      }
    }

    // If directory block is full, allocate a new one
    if (dir.nextBlock == 0) {
      int newBlock = allocateBlock();
      dir.nextBlock = newBlock;
      writeBlock(blockNum, reinterpret_cast<char*>(&dir));
      DirectoryBlock newDir = {};  // Create a new directory block
      std::strncpy(newDir.entries[0].name, name.c_str(), NAME_SIZE);
      newDir.entries[0].dataBlock = dataStartBlock;
      writeBlock(newBlock, reinterpret_cast<char*>(&newDir));
      return newBlock;  // Return the new block number
    }

    blockNum = dir.nextBlock;  // Move to the next directory block
  }
}

/**
 * Stores the content of a figure across multiple blocks of the disk.
 * If the content exceeds the block size, it will be split into multiple blocks.
 *
 * @param content The content of the figure to store.
 * @return A vector containing the block indices where the figure data is stored.
 */
std::vector<int> FileSystem::storeFigureData(const std::string& content) {
  std::vector<int> blocks;
  size_t pos = 0;
  while (pos < content.size()) {
    int blockIndex = allocateBlock();
    blocks.push_back(blockIndex);
    char buffer[BLOCK_SIZE] = {};
    size_t chunkSize = std::min<size_t>(BLOCK_SIZE, content.size() - pos);
    std::memcpy(buffer, content.data() + pos, chunkSize);
    writeBlock(blockIndex, buffer);
    pos += chunkSize;
  }
  return blocks;
}

/**
 * Adds a figure to the file system if it doesn't already exist.
 * The figure's content is stored on the disk, and its entry is added to the directory.
 *
 * @param name The name of the figure to add.
 * @param content The content of the figure to store.
 */
void FileSystem::addFigure(const std::string& name, const std::string& content) {
  if (figureExists(name)) {
    std::cout << "Figure '" << name << "' already exists. Skipping.\n";
    return;  // Skip if the figure already exists
  }
  auto blocks = storeFigureData(content);  // Store the figure's data in blocks
  appendToDirectory(name, blocks.front());  // Add entry to the directory
  std::cout << "Figure '" << name << "' added to disk.\n";
}

/**
 * Counts how many .txt figure files are present in the specified folder.
 *
 * @param path The path to the folder to scan for figure files.
 * @return The number of figure files found in the folder.
 */
int FileSystem::countFigures(const std::string& path) {
  int count = 0;
  for (const auto& entry : std::filesystem::directory_iterator(path)) {
    if (entry.path().extension() == ".txt") {
      ++count;  // Increment count for each .txt file
    }
  }
  return count;
}

/**
 * Loads figure files from a folder and adds them to the file system.
 * Each figure is read from a .txt file and stored on the disk.
 *
 * @param path The path to the folder containing figure files.
 */
void FileSystem::loadFiguresFromFolder(const std::string& path) {
  for (const auto& entry : fs::directory_iterator(path)) {
    if (entry.path().extension() == ".txt") {  // Only process .txt files
      std::ifstream file(entry.path());
      std::string content((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
      std::string filename = entry.path().stem().string();  // Get filename without extension
      addFigure(filename, content);  // Add the figure to the file system
    }
  }
}

/**
 * Retrieves a list of all figures stored on the disk, including the number of data blocks
 * each figure occupies.
 *
 * @return A string listing all figures and their respective data block counts.
 */
std::string FileSystem::getFigureList() {
  DirectoryBlock dir;
  int blockNum = 0;
  std::ostringstream output;
  output << "Figures stored on disk:\n";

  while (true) {
    readBlock(blockNum, reinterpret_cast<char*>(&dir));
    output << "Directory block #" << blockNum << ":\n";

    for (int i = 0; i < DIR_ENTRIES; ++i) {
      if (dir.entries[i].name[0] != '\0') {
        std::string name(dir.entries[i].name);
        int dataBlock = dir.entries[i].dataBlock;
        int count = 0;
        char buffer[BLOCK_SIZE];

        // Count how many data blocks the figure uses
        while (true) {
          readBlock(dataBlock, buffer);
          ++count;
          if (std::strlen(buffer) < BLOCK_SIZE) break;  // End of data
          ++dataBlock;
        }

        output << "- " << name << " (" << count << " data blocks)\n";
      }
    }

    if (dir.nextBlock == 0) break;  // No more directory blocks
    output << "\n";
    blockNum = dir.nextBlock;  // Move to next directory block
  }

  output << "\n";  // Add line break for better readability
  return output.str();  // Return the list of figures
}

std::vector<std::string> FileSystem::getFigureNames() {
  std::vector<std::string> names;
  DirectoryBlock dir;
  int blockNum = 0;

  while (true) {
    readBlock(blockNum, reinterpret_cast<char*>(&dir));
    for (int i = 0; i < DIR_ENTRIES; ++i) {
      if (dir.entries[i].name[0] != '\0') {
        names.push_back(std::string(dir.entries[i].name));
      }
    }
    if (dir.nextBlock == 0) break;
    blockNum = dir.nextBlock;
  }
  return names;
}

/**
 * Retrieves the full content of a figure from the file system based on its name.
 * The content is read from multiple data blocks if necessary.
 *
 * @param name The name of the figure to retrieve.
 * @return The content of the figure or a message if the figure is not found.
 */
std::string FileSystem::getFigureContent(const std::string& name) {
  DirectoryBlock dir;
  int blockNum = 0;
  std::string output;

  while (true) {
    readBlock(blockNum, reinterpret_cast<char*>(&dir));
    for (int i = 0; i < DIR_ENTRIES; ++i) {
      if (std::strncmp(dir.entries[i].name, name.c_str(), NAME_SIZE) == 0) {
        int dataBlock = dir.entries[i].dataBlock;
        char buffer[BLOCK_SIZE];
        while (true) {
          readBlock(dataBlock, buffer);
          output.append(buffer, strnlen(buffer, BLOCK_SIZE));  // Append content
          if (std::strlen(buffer) < BLOCK_SIZE) break;  // End of data
          ++dataBlock;
        }
        return output;  // Return the figure content
      }
    }
    if (dir.nextBlock == 0) break;  // No more directory blocks
    blockNum = dir.nextBlock;  // Move to next directory block
  }
  return "Figure not found.\n";  // Return error message if figure is not found
}
