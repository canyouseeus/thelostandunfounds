# Scan Directory with R

## Set Working Directory in R

```r
# Use setwd() with the full path in quotes
setwd("/Users/canyouseeus/Library/Application Support/Cursor/User/workspaceStorage")

# Or use tilde (R will expand it)
setwd("~/Library/Application Support/Cursor/User/workspaceStorage")

# Verify you're in the right place
getwd()
```

## List Files in R

```r
# List all files and folders
list.files()

# List with details
list.files(full.names = TRUE)

# List recursively (all subdirectories)
list.files(recursive = TRUE)

# List with file info
file.info(list.files())
```

## Check Specific Folders

```r
# Check what's in the existing folders
list.files("1762986751689")
list.files("ab121924d1bd1a5c18c41e14c662f275")

# Or get full paths
list.files("1762986751689", full.names = TRUE)
```

## Search for Specific Files

```r
# Find all JSON files
list.files(pattern = "\\.json$", recursive = TRUE)

# Find files with "agent" in name
list.files(pattern = "agent", recursive = TRUE, ignore.case = TRUE)

# Find all files recursively
list.files(recursive = TRUE, full.names = TRUE)
```
