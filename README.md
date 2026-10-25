# WhereDidIPutIt?

A simple web app for keeping track of where your physical items and in-game items are.
The interface is available in Norwegian and English, and works on mobile and desktop.

## Starting the app

The app is plain HTML, CSS and JavaScript. The only requirement is [Node.js](https://nodejs.org) (no packages to install).

**Recommended:** Double-click `start.bat`, or run this in the project folder:

```bash
node server.js
```

Then open <http://localhost:3000>. The server only listens on your own computer. Your items are saved to `data.json` in the project folder, independent of browser history.

**Without Node.js:** Double-click `index.html`. The app then falls back to saving in the browser (see below).

The fonts (Outfit and Space Grotesk, SIL Open Font License) are bundled in the `fonts/` folder, so the app works offline and loads nothing from third parties.

## How to use it

### Adding an item
1. Click the large **+ Add** button at the bottom right, or press **N** on the keyboard (works when you are not typing in a field and no form is open).
2. Fill in **name**, **type** (physical or game), **category** and **quantity**. Description is optional.
3. Fill in the location. The fields depend on the type:
   - **Physical:** room, furniture and specific spot, for example *Hallway → Shelf → Bottom tray*.
   - **Game:** game, account name or nickname, character, and inventory/stash/stash tab.
4. Optionally add a **photo**: choose a file, or copy an image (for example a screenshot) and press **Ctrl+V** while the form is open. It is shrunk to at most 1280 px and saved together with the item (inside `data.json`). A small preview is shown on the card and in the list; click it to see the full image (click again or press Esc to close). Use *Remove photo* to delete it.
5. Click **Save**, or press **Ctrl+S** / **Ctrl+Enter** (also works when editing). **Esc** closes the form without saving.

The room, game and category fields suggest values you have used before. Typing a new name creates it automatically.

### Finding items
- **Search** looks through all fields: name, category, description, room, furniture, spot, game, account, character and stash.
- **Filter** by type, category, game and room. The game filter is hidden when you only show physical items, and the room filter is hidden when you only show game items.
- **Sort** by newest (the default), name, game/room or category.- Switch between **Cards** and **List** with the buttons on the right.
- The location is shown in the yellow box on each item.

### Editing and deleting
- **Edit** opens the form with the saved values.
- **Delete** asks for confirmation before removing the item.

### Language
Click **EN** / **NO** at the top right to switch language. Your choice is remembered.

## Storage and privacy

- With `server.js` running, your items are saved to `data.json` in the project folder. It is not affected by clearing browser history, and you can back it up or copy it to another computer. Nothing leaves your machine.
- On the first run with the server, any items already saved in your browser are moved into `data.json`. Otherwise sample items are added.
- If you open `index.html` directly (no server), items are saved in the browser instead (`localStorage`, key `wheredidiputit.items.v1`). That data is tied to the browser and address, and clearing browser data deletes it. The line above the list tells you where data is saved.
- To reset to the sample items, delete `data.json` (and the browser key above, if you used it) and reload the page.
- Language and view (cards/list) are still remembered in the browser.
- The app has no login and no fields for passwords or API keys. Do not write such information in the description.

## Files

| File | Contents |
| --- | --- |
| `index.html` | Page structure and form |
| `style.css` | Design |
| `app.js` | Logic, translations, storage and sample data |
| `server.js` | Tiny local server that serves the app and writes `data.json` |
| `start.bat` | Windows shortcut that starts the server and opens the app |
| `fonts/` | Bundled fonts |
| `data.json` | Your items (created on first run) |

## Test plan

1. **Creating:** add a physical item and a game item. The location should appear in the yellow box. The form should not save without a name and category.
2. **Search:** search for "shelf" and for a game name. Only matches are shown.
3. **Filtering:** choose *Game*, then a category, a game or a room. The count above the list changes.
4. **Editing:** click *Edit*, change the name, quantity and location, and save.
5. **Deleting:** click *Delete*, cancel (the item stays), then delete again and confirm.
6. **File storage:** reload the page (F5), then stop and restart the server, and clear the browser's site data. All items are still there, and `data.json` contains your changes.
7. **Mobile:** narrow the window to under 700 px. The controls stack and the cards switch to one column.
