# Using R to Access File Paths

If you need to work with files in R, use these commands:

## Set Working Directory in R

```r
# Use setwd() function with quoted path
setwd("/Users/canyouseeus/Library/Application Support/Cursor/User/workspaceStorage")

# Or use tilde (R expands it)
setwd("~/Library/Application Support/Cursor/User/workspaceStorage")

# Check current directory
getwd()

# List files in directory
list.files()
```

## But R Won't Recover Deleted Files

R is for data analysis, not file recovery. To recover deleted files, you need a file recovery tool.

## For File Recovery, Use:

1. **Time Machine** (if enabled) - Built into macOS
2. **Disk Drill** - Commercial recovery tool
3. **PhotoRec** - Free recovery tool
4. **Data Rescue** - Commercial recovery tool

## If You Want to Check What Files Exist (Not Recover Deleted Ones)

In R, you can list existing files:
```r
setwd("~/Library/Application Support/Cursor/User/workspaceStorage")
list.files()
```

But this only shows files that still exist, not deleted ones.
