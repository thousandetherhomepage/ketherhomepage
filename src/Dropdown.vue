<template>
  <div class="dropdown">
    <ul :class="{selecting: isSelecting, disabled: disabled}">
      <li class="label" v-on:click="click(selected)">Select network</li>
      <li v-for="(value, name) in options" v-on:click="click(name, value)" :class="{selected: selected == value, option: true}">{{value.label || name}}</li>
      <li v-if="options[selected]===undefined" class="selected option">{{invalidName || "Invalid Option"}}</li>
    </ul>
  </div>
</template>

<script>
export default {
  props: ["options", "default", "disabled", "invalidName"],
  data() {
    return {
      isSelecting: false,
      isSelected: this.default,
    }
  },
  computed: {
    selected() {
      return this.isSelected || this.default;
    },
  },
  methods: {
    click(name, value) {
      if (this.disabled) return;
      if (!this.isSelecting) {
        this.isSelecting = true;
        return;
      }
      this.isSelecting = false;
      if (this.isSelected === value) return;
      this.isSelected = value;
      this.$emit('selected', name, value);
    },
  },
}
</script>

<style lang="scss">
$disabled-background: #4A90E2;
$background: #ffc107;

.dropdown {
  height: 1em;
  display: inline-block;
  font-size: 0.9em;

  ul {
    vertical-align: top;
    margin: -3px 0 0 0;
    display: inline-block;
    width: auto;
    padding: 0;
    border: 1px solid rgba(0, 0, 0, 0.05);
    background: $background;
    color: rgba(0, 0, 0, 0.6);

    &.disabled {
      background: $disabled-background;
      color: #fff;
      font-weight: bold;
      border: 0;

      li {
        cursor: default;
      }

      &:hover, .option:hover {
        background: $disabled-background;
      }
    }

    &.selecting {
      position: absolute;

      li {
        display: block;
        background: inherit;
      }
    }

    .option:hover {
      background: rgba(255, 255, 255, 0.5);
    }

    li.label {
      cursor: default;
      color: rgba(0, 0, 0, 0.8);
      background: rgba(0, 0, 0, 0.1);
    }
    li {
      cursor: pointer;
      margin: 0;
      padding: 3px 8px;
      display: none;
    }
    li.selected {
      background: rgba(255, 255, 255, 0.2);
      display: block;
    }
  }
}
</style>
