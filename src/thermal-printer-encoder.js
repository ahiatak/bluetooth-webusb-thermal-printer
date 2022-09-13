const Html2Canvas = require('html2canvas');
const EscPosEncoder = require('esc-pos-encoder');


/**
 * Create a byte stream based on commands for ESC/POS printers
 */
class ThermalPrinterEncoder extends EscPosEncoder {

    dataUrl;


  pageToCanvas(selector, appendToElement, width, height){
    if (width % 8 !== 0) {
      throw new Error('Width must be a multiple of 8');
    }

    if (height % 8 !== 0) {
      //throw new Error('Height must be a multiple of 8');
    }

    Html2Canvas(selector, {width: width}).then(function(canvas) {
        document.querySelector(appendToElement).appendChild(canvas)
        //document.body.appendChild(canvas);
        dataUrl= canvas.toDataURL("image/png");
        //$('.container-fluid').hide();
    });

      
  }

  /**
   * Image
   *
   * @param  {object}         element  an element, like a canvas or image that needs to be printed : url of image
   * @param  {number}         width  width of the image on the printer
   * @param  {number}         height  height of the image on the printer
   * @param  {string}         algorithm  the dithering algorithm for making the image black and white
   * @param  {number}         threshold  threshold for the dithering algorithm
   * @return {object}                  Return the object, for easy chaining commands
   *
   */

  image(element, width, height, algorithm, threshold) {
    if (width % 8 !== 0) {
      throw new Error('Width must be a multiple of 8');
    }

    if (height % 8 !== 0) {
      throw new Error('Height must be a multiple of 8');
    }

    if (typeof algorithm === 'undefined') {
      algorithm = 'threshold';
    }

    if (typeof threshold === 'undefined') {
      threshold = 128;
    }

    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    context.drawImage(element, 0, 0, width, height);
    let image = context.getImageData(0, 0, width, height);

    image = Flatten.flatten(image, [0xff, 0xff, 0xff]);

    switch (algorithm) {
      case 'threshold': image = Dither.threshold(image, threshold); break;
      case 'bayer': image = Dither.bayer(image, threshold); break;
      case 'floydsteinberg': image = Dither.floydsteinberg(image); break;
      case 'atkinson': image = Dither.atkinson(image); break;
    }

    const getPixel = (x, y) => image.data[((width * y) + x) * 4] > 0 ? 0 : 1;

    const bytes = new Uint8Array((width * height) >> 3);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x = x + 8) {
        const i = (y * (width >> 3)) + (x >> 3);
        bytes[i] =
                    getPixel(x + 0, y) << 7 |
                    getPixel(x + 1, y) << 6 |
                    getPixel(x + 2, y) << 5 |
                    getPixel(x + 3, y) << 4 |
                    getPixel(x + 4, y) << 3 |
                    getPixel(x + 5, y) << 2 |
                    getPixel(x + 6, y) << 1 |
                    getPixel(x + 7, y);
      }
    }

    this._queue([
      0x1d, 0x76, 0x30, 0x00,
      (width >> 3) & 0xff, (((width >> 3) >> 8) & 0xff),
      height & 0xff, ((height >> 8) & 0xff),
      bytes,
    ]);

    return this;
  }

}


module.exports = ThermalPrinterEncoder;