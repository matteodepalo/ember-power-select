import Ember from 'ember';
import { indexOfOption, optionAtIndex, filterOptions, countOptions } from '../../utils/group-utils';
const { RSVP, computed, run, get } = Ember;

export default Ember.Component.extend({
  classNames: ['ember-power-select-wrapper'],
  _highlighted: null,
  _searchText: '',
  _loadingOptions: false,
  attributeBindings: ['dir'],

  // Lifecycle hooks
  didReceiveAttrs({ newAttrs: { options } }) {
    this._super(...arguments);
    this.set('_loadingOptions', true);
    RSVP.Promise.resolve(options && options.value || options)
      .then(opts => this.updateOptions(opts))
      .finally(() => this.set('_loadingOptions', false));
  },

  // CPs
  _notLoadingOptions: computed.not('_loadingOptions'),

  dropdownClass: computed('class', function() {
    if (this.get('class')) {
      return `ember-power-select-dropdown ${this.get('class')}-dropdown`;
    } else {
      return 'ember-power-select-dropdown';
    }
  }),

  mustSearch: computed('_searchText', 'search', function(){
    return this.get('_searchText.length') === 0 && !!this.get('search');
  }),

  resultsLength: computed('results', function() {
    return countOptions(this.get('results'));
  }),

  // Actions
  actions: {
    highlight(option) {
      if (option && get(option, 'disabled')) { return; }
      this.set('_highlighted', option);
    },

    search(term /*, e */) {
      this.performSearch(term);
    },

    // It is not evident what is going on here, so I'll explain why.
    //
    // As of this writting, Ember doesn allow to yield data to the "inverse" block.
    // Because of that, elements of this component rendered in the trigger can't receive the
    // yielded object contaning the public API of the ember-basic-dropdown, with actions for open,
    // close and toggle.
    //
    // The only possible workaround for this is to on initialization inject a similar object
    // to the one yielded and store it to make it available in the entire component.
    //
    // This this limitation on ember should be fixed soon, this is temporary. Because of that this
    // object will be passed to the action from the inverse block like if it was yielded.
    //
    registerDropdown(dropdown) {
      this.set('registeredDropdown', dropdown);
    },
  },

  // Methods
  onOpen() {
    if (this._resultsDirty) { this.refreshResults(); }
    this.set('_highlighted', this.defaultHighlighted());
    run.scheduleOnce('afterRender', this, this.focusSearch);
    run.scheduleOnce('afterRender', this, this.scrollIfHighlightedIsOutOfViewport);
  },

  onClose() {
    this.set('_searchText', '');
    this.set('_highlighted', null);
    this._resultsDirty = true;
  },

  onKeydown(dropdown, e) {
    if (e.defaultPrevented) { return; }
    if (e.keyCode === 38 || e.keyCode === 40) { // Up & Down
      if (dropdown.isOpen) {
        this.handleVerticalArrowKey(e);
      } else {
        dropdown.open(e);
      }
    } else if (e.keyCode === 9) {  // Tab
      dropdown.close(e);
    } else if (e.keyCode === 27) { // ESC
      dropdown.close(e);
    }
  },

  handleVerticalArrowKey(e) {
    e.preventDefault();
    const newHighlighted = this.advanceSelectableOption(this.get('_highlighted'), e.keyCode === 40 ? 1 : -1);
    this.set('_highlighted', newHighlighted);
    run.scheduleOnce('afterRender', this, this.scrollIfHighlightedIsOutOfViewport);
  },

  scrollIfHighlightedIsOutOfViewport() {
    const optionsList = document.querySelector('.ember-power-select-options');
    const highlightedOption = optionsList.querySelector('.ember-power-select-option.highlighted');
    if (!highlightedOption) { return; }
    const optionTopScroll = highlightedOption.offsetTop - optionsList.offsetTop;
    const optionBottomScroll = optionTopScroll + highlightedOption.offsetHeight;
    if (optionBottomScroll > optionsList.offsetHeight + optionsList.scrollTop) {
      optionsList.scrollTop = optionBottomScroll - optionsList.offsetHeight;
    } else if (optionTopScroll < optionsList.scrollTop) {
      optionsList.scrollTop = optionTopScroll;
    }
  },

  indexOfOption(option) {
    return indexOfOption(this.get('results'), option);
  },

  optionAtIndex(index) {
    return optionAtIndex(this.get('results'), index);
  },

  advanceSelectableOption(currentHighlight, step) {
    let resultsLength = this.get('resultsLength');
    let startIndex = Math.min(Math.max(this.indexOfOption(currentHighlight) + step, 0), resultsLength - 1);
    let nextOption = this.optionAtIndex(startIndex);
    while (nextOption && get(nextOption, 'disabled')) {
      nextOption = this.optionAtIndex(startIndex += step);
    }
    return nextOption;
  },

  refreshResults() {
    const { _options: options, _searchText: searchText } = this.getProperties('_options', '_searchText');
    if (this.get('search')) {
      this.set('results', options);
    } else {
      let matcher;
      if (this.get('searchField')) {
        matcher = (option, text) => this.matcher(get(option, this.get('searchField')), text);
      } else {
        matcher = (option, text) => this.matcher(option, text);
      }
      this.set('results', filterOptions(options || [], searchText, matcher));
    }
    this._resultsDirty = false;
    this.set('_highlighted', this.optionAtIndex(0));
  },

  updateOptions(options) {
    this.set('_options', options);
    this.refreshResults();
  },

  performCustomSearch(term) {
    this.set('_loadingOptions', true);
    const promise = RSVP.Promise.resolve(this.get('search')(term));
    this.set('_activeSearch', promise);
    promise.then(results => {
      if (promise !== this.get('_activeSearch')) { return; }
      this.set('results', results);
      this.set('_highlighted', this.optionAtIndex(0));
    }).finally(() => {
      if (promise !== this.get('_activeSearch')) { return; }
      this.set('_loadingOptions', false);
    });
  },

  performSearch(term) {
    this.set('_searchText', term);
    if (this.get('search')) {
      this.performCustomSearch(term);
    } else {
      this.refreshResults();
    }
  }
});
