# QuickTab

Firefox extension that helps you quickly switch between tabs using keyboard shortcuts and fuzzy search.
Inspired par [fzf](https://github.com/junegunn/fzf).

## Features

- Fuzzy search through your open tabs
- Filters tags
- Light and dark themes

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Myouboku/QuickTab.git
   ```
2. Open Firefox and go to `about:debugging`
3. Click on "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from the QuickTab directory

## Usage

1. Press `Ctrl+Space` to open QuickTab
2. Start typing to search through your tabs
3. Use arrow keys to navigate through results
4. Press `Enter` to switch to the selected tab

### Special Commands

- `@audio` - Show only tabs playing audio
- `@pinned` - Show only pinned tabs

You can combine these commands with text search, for example: `@audio music` will show tabs playing audio that match "music".
