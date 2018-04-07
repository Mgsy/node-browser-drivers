const fs = require( 'fs' );
const expect = require( 'chai' ).expect;

describe( 'Download', () => {
  it( 'Check whether chromedriver has downloaded and extracted properly', () => {
    isChromeDriver = fs.existsSync( 'lib/chromedriver' );

    expect( isChromeDriver ).to.be.true;
  } );

  it( 'Check whether geckodriver has downloaded and extracted properly', () => {
    isGeckoDriver = fs.existsSync( 'lib/geckodriver' );

    expect( isGeckoDriver ).to.be.true;
  } );
} );
