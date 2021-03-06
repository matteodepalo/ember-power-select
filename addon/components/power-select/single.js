import Ember from 'ember';
import PowerSelectBaseComponent from './base';
import layout from '../../templates/components/power-select/single';

const { computed } = Ember;

export default PowerSelectBaseComponent.extend({
  layout: layout,

  // CPs
  selection: computed('selected', {
    get() { return this.get('selected'); },
    set(_, v) { return v; }
  }),

  // Actions
  actions: {
    clear(dropdown, e) {
      e.stopPropagation();
      e.preventDefault();
      this.set('selection', null);
      this.get('onchange')(null, dropdown);
    },

    triggerKeydown(dropdown, e) {
      if (e.keyCode === 40 || e.keyCode === 38) {
        dropdown.open(e);
        e.preventDefault();
      }
    }
  },

  // Methods
  onKeydown(dropdown, e) {
    if (e.defaultPrevented) { return; }
    if (e.keyCode === 13 && dropdown.isOpen) { // Enter
      this.select(this.get('_highlighted'), dropdown, e);
    } else {
      this._super(...arguments);
    }
  },

  defaultHighlighted() {
    return this.get('selection') || this.optionAtIndex(0);
  },

  select(option, dropdown, e) {
    e.preventDefault();
    if (this.get('closeOnSelect')) {
      dropdown.close(e);
    }
    if (this.get('selection') !== option) {
      this.get('onchange')(option, dropdown);
    }
  },

  focusSearch() {
    Ember.$('.ember-power-select-search input').focus();
  }
});
