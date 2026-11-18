import { css } from 'lit';

export const styles = css`
  :host {
    --icon-size: var(--radial-icon-size, var(--mdc-icon-size, 24px));
    --menu-button-color: var(--radial-menu-button-color, var(--primary-color, #212121));
    --menu-item-color: var(--radial-menu-item-color, var(--primary-color, #212121));
    --menu-item-hover-color: var(--radial-menu-item-hover-color, var(--accent-color));
    --menu-item-hover-background: var(--radial-menu-item-hover-background, var(--secondary-background-color));
    --menu-transition: var(--radial-menu-transition, 0.4s ease-out);
  }

  ha-icon {
    --mdc-icon-size: var(--icon-size);
  }

  .circular-menu {
    width: var(--radial-size, 250px);
    aspect-ratio: 1;
    margin: 0 auto;
    position: relative;
  }

  .circle {
    width: 100%;
    height: 100%;
    opacity: 0;
    transform: scale(0);
    transition: all var(--menu-transition);
  }

  .open.circle {
    opacity: 1;
    transform: scale(1);
  }

  .circle ha-icon,
  .circle state-badge,
  .custom {
    display: block;
    position: absolute;
  }

  .custom {
    height: 100px;
    width: 100px;
    margin-left: -50px;
    margin-top: -50px;
  }

  .custom > * {
    display: block;
    width: 100%;
    height: 100%;
  }

  .circle ha-icon,
  .circle state-badge {
    text-decoration: none;
    border-radius: 50%;
    text-align: center;
    height: 40px;
    width: 40px;
    line-height: 40px;
    margin-left: -20px;
    margin-top: -20px;
    color: var(--radial-item-color, var(--menu-item-color));
  }

  .circle ha-icon:hover {
    color: var(--menu-item-hover-color);
  }

  .circle state-badge:hover {
    background-color: var(--menu-item-hover-background);
  }

  ha-icon,
  state-badge {
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    -webkit-user-select: none;
  }

  .circle ha-icon:active,
  .circle state-badge:active,
  .menu-button:active {
    opacity: 0.6;
  }

  .menu-button {
    position: absolute;
    text-decoration: none;
    text-align: center;
    border-radius: 50%;
    display: block;
    height: 40px;
    width: 40px;
    line-height: 40px;
    color: var(--menu-button-color);
  }

  state-badge.menu-button {
    top: calc(50% - 20px);
    left: calc(50% - 20px);
  }

  ha-icon.menu-button {
    top: calc(50% - 30px);
    left: calc(50% - 30px);
    padding: 10px;
  }

  .menu-button:hover {
    background-color: var(--menu-item-hover-background);
  }
`;
