# Step Todo Card for Home Assistant

A custom Lovelace card that displays one item from a Todo list at a time, letting you complete tasks step-by-step.

## Installation via HACS

1. Go to **HACS → Frontend → Custom repositories → Add repository**
2. URL: `https://github.com/taysuus/step-todo-card`
3. Category: **Dashboard**
4. Click **Add**, then search for **Step Todo Card** and install.

## Manual Installation

Copy `step-todo-card.js` to your `config/www` folder, then add this resource:

```yaml
url: /local/step-todo-card.js
type: module
```

## Example Lovelace Config

```yaml
type: custom:step-todo-card
entity: todo.my_list
title: Morning Routine
done_message: "All done!"
```

## Features

- Shows only the next incomplete item
- "Done" button automatically completes and advances
- step counter
- Works with any Home Assistant todo.\* entity
- "Reset" button automatically resets all items once all are complete
