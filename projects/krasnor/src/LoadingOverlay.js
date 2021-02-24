export class LoadingOverlay {

    constructor(initializeHidden = false, defaultLoadingText = "Loading...") {
        this.domElement = document.createElement('div');
        this.center = document.createElement('div');
        this.loadingCircle = document.createElement('div');
        this.loadingText = document.createElement('p');
        if(initializeHidden){
            this.domElement.className = "overlay-base overlay-hidden";
        }else{
            this.domElement.className = "overlay-base overlay-visible";
        }
        this.center.className = "overlay-center";
        this.loadingCircle.className = "overlay-loader";
        this.loadingText.className = "overlay-description";

        this.defaultLoadingText = defaultLoadingText;
        this.loadingText.innerHTML = this.defaultLoadingText;

        this.center.appendChild(this.loadingCircle);
        this.center.appendChild(this.loadingText);
        this.domElement.appendChild(this.center);
    }

    show(){
        this.domElement.className = "overlay-base overlay-visible";
    }
    hide(){
        this.domElement.className = "overlay-base overlay-hidden";
    }
    setVisible(isVisible, loadingText = this.defaultLoadingText){

        if(isVisible){
            this.loadingText.innerHTML = loadingText;
            this.show();
        }else{
            this.hide();
        }
    }

    /**
     * Creates and inserts a default css style, that is compatible with the LoadingOverlay, into the documents header.
     *
     * @returns {HTMLStyleElement}
     */
    insertDefaultStyleToDom(){
        let styleEl = document.createElement('style');
        // styleEl.type = "text/css" // deprecated?
        styleEl.id = "loading-overlay-default-style"
        document.head.appendChild(styleEl);
        let styleSheet = styleEl.sheet;
        styleSheet.insertRule(
            '.overlay-base {\n' +
            '  top: 0px;\n' +
            '  left: 0px;\n' +
            '  position: fixed;\n' +
            '  min-width: 100%;\n' +
            '  min-height: 100%;\n' +

            '  color: #eee;\n' +
            '  z-index: 9;\n' +
            '}'
        );
        styleSheet.insertRule(
            '.overlay-hidden {\n' +
            '  visibility: hidden;\n' +
            '  opacity: 0;\n' +
            '  transition: opacity 1s, visibility 1s;\n' +
            '}'
        )
        styleSheet.insertRule(
            '.overlay-visible {\n' +
            '  visibility: visible;\n' +
            '  opacity: 0.94;\n' +
            // '  transition: opacity 33ms, visibility 33ms;\n' +
            '}'
        )
        styleSheet.insertRule(
            '.overlay-center {\n' +
            '  top: 50%;\n' +
            '  left: 50%;\n' +
            '  position: absolute;\n' +
            '  transform: translate(-50%, -50%);\n' +

            '  background: #323232;\n' +
            '  opacity: 0.94;\n' +
            '  border-radius: 25px;\n' +
            '  padding: 25px;\n' +
            '}'
        );
        styleSheet.insertRule(
            '.overlay-loader {\n' +
            '  border: 16px solid #f3f3f3; /* Light grey */\n' +
            '  border-top: 16px solid #3498db; /* Blue */\n' +
            '  border-radius: 50%;\n' +
            '  width: 120px;\n' +
            '  height: 120px;\n' +
            '  animation: spin 2s linear infinite;\n' +
            '}'
        );
        styleSheet.insertRule(
            '.overlay-description {\n' +
            '  font: bold 16px Helvetica,Arial,sans-serif;\n' +
            '  text-align: center;\n' +
            '  margin-top: 25px;\n' +
            '  margin-bottom: 0px;\n' +
            '  user-select: none;\n' +
            '}'
        );
        styleSheet.insertRule(
            '@keyframes spin {\n' +
            '  0% { transform: rotate(0deg); }\n' +
            '  100% { transform: rotate(360deg); }\n' +
            '}'
        )
        return styleEl;
    }
}