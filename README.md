# ⭕ Lovelace Radial Menu Element by [@iantrich](https://www.github.com/iantrich)

[![GitHub Release][releases-shield]][releases]
[![GitHub Activity][commits-shield]][commits]
[![custom_updater][customupdaterbadge]][customupdater]
[![License][license-shield]](LICENSE.md)

![Project Maintenance][maintenance-shield]
[![BuyMeCoffee][buymecoffeebadge]][buymecoffee]

[![Discord][discord-shield]][discord]
[![Community Forum][forum-shield]][forum]

[![Twitter][twitter]][twitter]
[![Github][github]][github]

This element is for [Lovelace](https://www.home-assistant.io/lovelace) on [Home Assistant](https://www.home-assistant.io/) that provides a radial menu on click for quick/space saving access to commands. Designed for picture-elements, but can be used anywhere.

![example](example.gif)

## Options

| Name | Type | Requirement | Description | Default
| ---- | ---- | ------- | ----------- | -------
| type | string | **Required** | `custom:radial-menu` | `none`
| items | list | **Required** | List of items to display in the radial | `none`
| name | string | **Optional** | Tooltip for main menu | `Menu`
| icon | string | **Optional** | mdi icon for main menu | `mdi:menu`
| entity_picture | string | **Optional** | picture to display | `none`
| default_open | boolean | **Optional** | Should the radial be expanded on first load | `false`
| default_dismiss | boolean | **Optional** | Should the radial be dismissed on click | `true`
| entity | string | **Optional** | Home Assistant entity ID (used for `more-info` action) | `none`
| tap_action | object | **Optional** | Action to take on tap | `action: toggle-menu`
| hold_action | object | **Optional** | Action to take on hold | `none`


## Items Options

| Name | Type | Requirement | Description | Default
| ---- | ---- | ------- | ----------- | -------
| entity | string | **Optional** | Home Assistant entity ID. | `none`
| name | string | **Optional** | Tooltip for main menu | `Menu`
| icon | string | **Optional** | mdi icon for main menu | `none`
| entity_picture | string | **Optional** | picture to display | `none`
| tap_action | object | **Optional** | Action to take on tap | `action: more-info`
| hold_action | object | **Optional** | Action to take on hold | `none`

## Action Options

| Name | Type | Requirement | Description | Default
| ---- | ---- | ------- | ----------- | -------
| action | string | **Required** | Action to perform (toggle-menu, more-info, toggle, call-service, navigate url, none) | `toggle-menu` for menu and `more-info` for items
| navigation_path | string | **Optional** | Path to navigate to (e.g. /lovelace/0/) when action defined as navigate | `none`
| url | string | **Optional** | URL to open on click when action is url. The URL will open in a new tab | `none`
| service | string | **Optional** | Service to call (e.g. media_player.media_play_pause) when action defined as call-service | `none`
| service_data | object | **Optional** | Service data to include (e.g. entity_id: media_player.bedroom) when action defined as call-service | `none`
| haptic | string | **Optional** | Haptic feedback for the [Beta IOS App](http://home-assistant.io/ios/beta) _success, warning, failure, light, medium, heavy, selection_ | `none`

## Installation

### Step 1

Save [radial-menu](https://github.com/custom-cards/radial-menu/raw/master/dist/radial-menu.js) to `<config directory>/www/radial-menu.js` on your Home Assistant instanse.

**Example:**

```bash
wget https://raw.githubusercontent.com/custom-cards/radial-menu/master/dist/radial-menu.js
mv radial-menu.js /config/www/
```

### Step 2

Link `radial-menu` inside your `ui-lovelace.yaml` or Raw Editor in the UI Editor

```yaml
resources:
  - url: /local/radial-menu.js
    type: module
```

### Step 3

Add a custom element in your `ui-lovelace.yaml` or in the UI Editor as a Manual Card

```yaml
type: 'custom:radial-menu'
icon: 'mdi:home'
name: 'Home'
default_open: true
default_dismiss: false
hold_action:
  action: url
  url: https://www.home-assistant.io
items:
  - entity: light.bed_light
    icon: 'mdi:flash'
    name: Bedroom Light
    tap_action:
      action: toggle
      haptic: true
    hold_action:
      action: more-info
  - entity: alarm_control_panel.ha_alarm
    icon: 'mdi:alarm-light'
    name: Alarm Panel
    tap_action:
      action: more-info
  - icon: 'mdi:alarm'
    name: Timer
    tap_action:
      action: call-service
      service: timer.start
      service_data:
        entity_id: timer.laundry
      haptic: true
    hold_action:
      action: call-service
      service: timer.pause
      service_data:
        entity_id: timer.laundry
      haptic: true
  - entity_picture: '/local/headphones.png'
    name: Podcasts
    tap_action:
      action: navigate
      navigation_path: /lovelace/1
```

[Troubleshooting](https://github.com/thomasloven/hass-config/wiki/Lovelace-Plugins)

Inspiration taken from [Creative Punch](https://codepen.io/CreativePunch/pen/lAHiu)

[buymecoffee]: https://www.buymeacoffee.com/iantrich
[buymecoffeebadge]: https://img.shields.io/badge/buy%20me%20a%20coffee-donate-blue.svg?style=for-the-badge
[commits-shield]: https://img.shields.io/github/commit-activity/y/custom-cards/radial-menu.svg?style=for-the-badge
[commits]: https://github.com/custom-cards/radial-menu/commits/master
[customupdater]: https://github.com/custom-components/custom_updater
[customupdaterbadge]: https://img.shields.io/badge/custom__updater-true-success.svg?style=for-the-badge
[discord]: https://discord.gg/Qa5fW2R
[discord-shield]: https://img.shields.io/discord/330944238910963714.svg?style=for-the-badge
[forum-shield]: https://img.shields.io/badge/community-forum-brightgreen.svg?style=for-the-badge
[forum]: https://community.home-assistant.io/t/lovelace-radial-menu-element/111210
[license-shield]: https://img.shields.io/github/license/custom-cards/radial-menu.svg?style=for-the-badge
[maintenance-shield]: https://img.shields.io/badge/maintainer-Ian%20Richardson%20%40iantrich-blue.svg?style=for-the-badge
[releases-shield]: https://img.shields.io/github/release/custom-cards/radial-menu.svg?style=for-the-badge
[releases]: https://github.com/custom-cards/radial-menu/releases
[twitter]: https://img.shields.io/twitter/follow/iantrich.svg?style=social
[github]: https://img.shields.io/github/followers/iantrich.svg?style=social
