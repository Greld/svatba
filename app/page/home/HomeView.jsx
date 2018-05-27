import AbstractComponent from 'ima/page/AbstractComponent';
import PropTypes from 'prop-types';
import React from 'react';

/**
 * Home page.
 */
export default class HomeView extends AbstractComponent {
  static get contextTypes() {
    return {
      $Utils: PropTypes.object
    };
  }

  render() {
    return (
      <div className="l-homepage">
        <div className="content">
          <img
            src={
              this.utils.$Router.getBaseUrl() +
              this.utils.$Settings.$Static.image +
              '/pozvanka.jpeg'
            }
            alt="Lucie & Honza 14. 7. 2018, Špilberk, Jihozápadní bastion"
          />
        </div>
      </div>
    );
  }
}
