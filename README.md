# QuickTab

Extension that helps you quickly switch between tabs using keyboard shortcuts and fuzzy search.

Inspired by [fzf](https://github.com/junegunn/fzf).

## Features

- Fuzzy search through your open tabs
- Filter tags
- Light and dark themes

## Installation

### Firefox

1. Go to the [latest release](https://github.com/Myouboku/QuickTab/releases/latest)
2. Download the `.xpi` file
3. Go to `about:addons`
4. Click on the cogwheel
5. Click on "Install from file"
6. Select the `.xpi` file

### Chrome

1. Clone the repo
2. Go to `chrome://extensions/`
3. Enable developer mode
4. Click on "Load unpacked extension"
5. Select the QuickTab directory

## Usage

1. Press `Ctrl+Space` to open QuickTab
2. Start typing to search through your tabs
3. Use arrow keys to navigate through results
4. Press `Enter` to switch to the selected tab

### Special tags

- `@audio` - Show only tabs playing audio
- `@pinned` - Show only pinned tabs
- `@url` - Search in URLs instead of tab titles
- `@domain` - Filter tabs by domain name

You can combine these tags with text search, for example: `@pinned music` will show pinned tabs that match "music".

## TODO (maybe)

- [ ] More @tags
- [ ] Settings
  - [x] Change accent color
  - [ ] Force light/dark theme
  - [ ] Disabling animations
  - [ ] Change dimensions
- [ ] Optimisations (better code in general if I'm not too lazy)
- [ ] Upload to store
- [x] Chrome version
