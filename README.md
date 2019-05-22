Grouped dropdown
=============


## Description
If you want to show hierarchical data in a dropdown selector, this is the widget for you!
This widget groups dropdown values by a specified reference and displays group labels in the dropdown.

## Features:
- Group options in a select list

## Limitations
- Nesting groups is not possible
- Always sorted alphabetically
- No constraint on values shown

## Dependencies

- [Mendix 6.x or higher](https://appstore.mendix.com/).

## Configuration

Add the .mpk in dist to your project or build it yourself using:

```
gulp build
```

Add the widget to a dataview. Select the attribute that you want to create a dropdown for. Select an association to group by.
