const https = require( 'follow-redirects' ).https;
const jsdom = require( 'jsdom' );
const { JSDOM } = jsdom;
const AdmZip = require( 'adm-zip' );
const targz = require( 'targz' );
const process = require( 'process' );
const fs = require( 'fs' );

( function install() {
  downloadDrivers();
} )();

async function downloadDrivers() {
  const platform = process.platform;
  const arch = process.arch;

  let driversToDownload = [];

  console.log( '[*] Gathering information about OS.' );

  if ( platform == 'win32' ) {
    console.log( `[*] Downloading drivers for Windows ${ arch }` );

    driversToDownload = [ 'chromeDriver', 'geckoDriver', 'ieDriver', 'edgeDriver' ];

  } else if ( platform == 'darwin' ) {
    console.log( `[*] Downloading drivers for MacOS ${ arch }` );

    driversToDownload = [ 'chromeDriver', 'geckoDriver' ];

  } else if ( platform == 'linux' ) {
    console.log( `[*] Downloading drivers for Linux ${ arch }` );

    driversToDownload = [ 'chromeDriver', 'geckoDriver' ];

  } else {
    console.log( `[!] OS not supported. Aborting.` );

    return;
  }

  // Download available drivers
  for ( const driver of driversToDownload ) {
    await prepareDownload( driver ).then( ( fileName ) => {
      if ( fileName.match( /.exe/gi ) ) {
        return;
      }

      console.log( '[*] Extracting...');

      decompressArchive( fileName ).then( () => {
        console.log( '[*] Done.' );

        // Deletes the file after unzip
        fs.unlinkSync( `./lib/${ fileName }` );
      } );
    } );
  }
};

async function prepareDownload( driver ) {
  if ( !driver ) {
    console.log( '[!] Download error: Driver name must be provided.' );
    return;
  }

  const chromeDriverBaseUrl = 'https://sites.google.com/a/chromium.org/chromedriver/downloads';
  const geckoDriverBaseUrl = 'https://github.com/mozilla/geckodriver/releases';
  const ieDriverBaseUrl = 'https://www.seleniumhq.org/download/';
  const edgeDriverBaseUrl = 'https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/';

  let downloadLink = await createDownloadLink( eval( `${ driver }BaseUrl` ), driver );

  return new Promise( ( resolve, reject ) => {
    download( downloadLink ).then( ( fileName ) => {
      resolve( fileName );
    } );
  } );
};

/*
 * Downloads file from provided URL
 */

function download( url ) {
  return new Promise( ( resolve, reject ) => {
    let fileName = url.split( '/' ).pop();
    let file = fs.createWriteStream( `./lib/${ fileName }` );

    console.log( `[*] Downloading ${ fileName }` );

    https.get( url, ( response ) => {
      response.pipe( file );

      file.on( 'finish', () => {
        file.close( () => {
          console.log( '[*] Download complete.' );
          resolve( fileName );
        } );
      } );

      file.on( 'error', ( err ) => {
        fs.unlinkSync( `./lib/${ fileName }` );
        reject( err );
      } );
    } );
  } );
};

/*
 * Extracts archive
 */

function decompressArchive( fileName ) {
  return new Promise ( ( resolve, reject ) => {
    if ( fileName.match( /.zip/g ) ) {
      let archive = new AdmZip( `./lib/${ fileName }` );
      archive.extractAllTo( './lib', true );
      
      resolve();
    }

    targz.decompress( { src: `./lib/${ fileName }`, dest: './lib' }, () => {
      resolve();
    } );
  } );
};

/*
 * Creates download link from provided base URL
 */

async function createDownloadLink( url, driver ) {
    const platform = process.platform;
    const arch = process.arch;

    let downloadLink;
    let os = 'win32';

    platform == 'darwin' ? os = `mac${ arch.replace( /^x/, '' ) }` : os = `linux${ arch.replace( /^x/, '' ) }`;

    const siteHtml = await getBody( url );
    const dom = new JSDOM( siteHtml );

    if ( driver == 'chromeDriver' ) {
      const element = dom.window.document.querySelector( '#sites-canvas-main-content > table > tbody' +
                            '> tr > td > div > h2 > b > a' ).textContent;
      const driverVersion = element.replace( /[a-z ]/gi, '' );

      downloadLink = `https://chromedriver.storage.googleapis.com/${ driverVersion }/chromedriver_${ os }.zip`

    }

    if ( driver == 'geckoDriver' ) {
      const element = dom.window.document.querySelector( '#js-repo-pjax-container' +
                                                          '> div.container.new-discussion-timeline.experiment-repo-nav' +
                                                          '> div.repository-content > div.position-relative.border-top' +
                                                          '> div.release.clearfix.label-latest' +
                                                          '> div.release-body.commit.open.float-left > div.release-header > h1 > a' );

      const driverVersion = element.textContent;

      if ( platform == 'darwin' ) {
        downloadLink = `https://github.com/mozilla/geckodriver/releases/download/${ driverVersion }/geckodriver-${ driverVersion }-macos.tar.gz`;
      } else if ( platform == 'linux' ) {
        downloadLink = `https://github.com/mozilla/geckodriver/releases/download/${ driverVersion }/geckodriver-${ driverVersion }-${ os }.tar.gz`;
      } else if ( platform.match( /win/g ) && arch == 'x86' ) {
        downloadLink = `https://github.com/mozilla/geckodriver/releases/download/${ driverVersion }/geckodriver-${ driverVersion }-win32.zip`;
      } else {
        downloadLink = `https://github.com/mozilla/geckodriver/releases/download/${ driverVersion }/geckodriver-${ driverVersion }-win64.zip`;
      }
    }

    if ( driver == 'ieDriver' ) {
      const elementX86 = dom.window.document.querySelector( '#mainContent > p:nth-child(11) > a:nth-child(1)' );
      const elementX64 = dom.window.document.querySelector( '#mainContent > p:nth-child(11) > a:nth-child(2)' );

      arch == 'x86' ? downloadLink = elementX86.getAttribute( 'href' ) : downloadLink = elementX64.getAttribute( 'href' );

    }

    if ( driver == 'edgeDriver' ) {
      const element = dom.window.document.querySelector( '#downloads > div > div:nth-child(2) > ul > li:nth-child(1) > a' );

      downloadLink = element.getAttribute( 'href' );

    }

    return downloadLink;
};

/*
 * Requests to provided URL and returns website's body.
 */

function getBody( url ) {
  return new Promise( ( resolve, reject ) => {
    https.get( url, resp => {
      resp.setEncoding( 'utf-8' );
      let body = '';

      resp.on( 'data', data => {
        body += data;
      } );

      resp.on( 'end', () => {
        resolve( body );
      } );

      resp.on( 'error', err => {
        reject( err );
      } );
    } );
  } );
};
