/**
 * Distributed ASCII Art System
 * Module: FileSystem.h
 *
 * Interface for the custom block-based file system simulating a disk inside a binary file (disk.bin).
 *
 * Author: Josue Torres
 * Copyright (c) 2025 Josue Torres
 * Licensed under the MIT License.
 */

#pragma once

#include <string>
#include <vector>
#include <cstdint>

const int BLOCK_SIZE = 256;  // Size of each block in bytes
const int NAME_SIZE = 32;    // Maximum size of a file name
const int DIR_ENTRIES = 7;   // Number of entries in a directory block
const std::string DISK_FILENAME = "disk.bin";  // Default disk filename

/**
 * Structure to represent a directory entry, containing the name of the figure
 * and the block number where its data is stored.
 */
struct DirEntry {
  char name[NAME_SIZE];  // File name
  uint32_t dataBlock;    // Data block where the figure's content is stored
};

/**
 * Structure to represent a directory block, which contains multiple directory
 * entries and a pointer to the next directory block in case more space is needed.
 */
struct DirectoryBlock {
  DirEntry entries[DIR_ENTRIES];  // Directory entries in this block
  uint32_t nextBlock;             // Next directory block (0 if none)
};

/**
 * Class representing a file system that stores files in blocks on a disk.
 * Supports operations such as adding figures, listing them, and retrieving their content.
 */
class FileSystem {
 public:
  /**
   * Constructs the FileSystem object and optionally initializes it with a specific disk file.
   *
   * @param diskFilename The name of the disk file to be used (defaults to "disk.bin").
   */
  FileSystem(const std::string& diskFilename = DISK_FILENAME);

  /**
   * Initializes the disk by allocating space for the given number of directory blocks.
   *
   * @param numDirBlocks The number of directory blocks to allocate.
   */
  void initDisk(int numDirBlocks);

  /**
   * Checks whether a figure with the given name exists in the file system.
   *
   * @param name The name of the figure to check.
   * @return true if the figure exists, false otherwise.
   */
  bool figureExists(const std::string& name);

  /**
   * Adds a new figure to the file system, storing its content in the disk.
   *
   * @param name The name of the figure to add.
   * @param content The content of the figure to store.
   */
  void addFigure(const std::string& name, const std::string& content);

  /**
   * Loads all figures from a specified folder into the file system.
   *
   * @param path The path to the folder containing the figure files.
   */
  void loadFiguresFromFolder(const std::string& path);

  /**
   * Retrieves a list of all figure names stored in the file system.
   *
   * @return A string containing the names of all figures, separated by newlines.
   */
  std::string getFigureList();

  /**
   * Retrieves a vector containing all figure names stored on the disk.
   *
   * @return A vector of strings with figure names.
   */
  std::vector<std::string> getFigureNames();

  /**
   * Retrieves the content of a specific figure by its name.
   *
   * @param name The name of the figure whose content is to be retrieved.
   * @return The content of the figure as a string, or an empty string if not found.
   */
  std::string getFigureContent(const std::string& name);

  /**
   * Counts how many figures are stored in the specified folder.
   *
   * @param path The path to the folder containing the figure files.
   * @return The number of figure files in the folder.
   */
  int countFigures(const std::string& path);

 private:
  std::string diskFilename;  // The file where the disk data is stored
  int nextFreeBlock = 0;     // Keeps track of the next available block on the disk

  /**
   * Writes a block of data to the disk at the specified block number.
   *
   * @param blockNum The block number where the data will be written.
   * @param data A pointer to the data to be written.
   */
  void writeBlock(int blockNum, const char* data);

  /**
   * Reads a block of data from the disk at the specified block number.
   *
   * @param blockNum The block number to read from.
   * @param buffer A buffer to store the read data.
   */
  void readBlock(int blockNum, char* buffer);

  /**
   * Gets the total number of blocks currently allocated in the file system.
   *
   * @return The total number of blocks in use.
   */
  int getBlockCount();

  /**
   * Allocates a new block on the disk and returns the block number.
   *
   * @return The block number of the newly allocated block.
   */
  int allocateBlock();

  /**
   * Appends a new entry to the directory with the given figure name and starting data block.
   *
   * @param name The name of the figure.
   * @param dataStartBlock The block number where the figure data starts.
   * @return The block number of the directory that contains the new entry.
   */
  int appendToDirectory(const std::string& name, int dataStartBlock);

  /**
   * Stores the content of a figure by splitting it across multiple blocks if necessary.
   *
   * @param content The content of the figure to store.
   * @return A vector containing the block numbers where the content was stored.
   */
  std::vector<int> storeFigureData(const std::string& content);
};
