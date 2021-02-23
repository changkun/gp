export class LoadingOverlay {

    constructor(initializeHidden = false, defaultLoadingText = "Loading...") {
        this.dom = document.createElement('div');
        this.center = document.createElement('div');
        this.loadingCircle = document.createElement('div');
        this.loadingText = document.createElement('p');
        if(initializeHidden){
            this.dom.className = "overlay-hidden";
        }else{
            this.dom.className = "overlay-visible";
        }
        this.center.className = "overlay-center";
        this.loadingCircle.className = "overlay-loader";
        this.loadingText.className = "overlay-description";

        this.defaultLoadingText = defaultLoadingText;
        this.loadingText.innerHTML = this.defaultLoadingText;

        this.center.appendChild(this.loadingCircle);
        this.center.appendChild(this.loadingText);
        this.dom.appendChild(this.center);

        this._setPositions();
        this._setStyle();
    }
    _setPositions(){
        this.dom.style.top = "0px";
        this.dom.style.left = "0px";
        this.center.style.top = "50%";
        this.center.style.left = "50%";
        this.center.style.position = "absolute";
        this.center.style.transform = "translate(-50%, -50%)";
        this.loadingText.style.textAlign = "center"
    }

    _setStyle(){
        this.dom.style.minWidth = "100%";
        this.dom.style.minHeight = "100%";
        this.dom.style.position = "fixed";
        // this.dom.style.opacity = '0.90';
        // this.dom.style.background = "#1a1a1a";
        // this.dom.style.background = "#323232";
        this.dom.style.color = "#eee";
        //this.dom.style.zIndex = "9"
        this.loadingText.style.font = 'bold 16px Helvetica,Arial,sans-serif';

        this.center.style.background = "#323232";
        this.center.style.opacity = '0.94';
        this.center.style.borderRadius = "25px";
        this.center.style.padding = "25px";
    }

    show(){
        // this.dom.style.display = 'block';
        this.dom.className = "overlay-visible";
    }
    hide(){
        // this.dom.style.display = 'none';
        this.dom.className = "overlay-hidden";
    }
    setVisible(isVisible, loadingText = this.defaultLoadingText){
        this.loadingText.innerHTML = loadingText;

        if(isVisible){
            this.show();
        }else{
            this.hide();
        }
    }

    insertStyleDom(){
        let styleEl = document.createElement('style');
        styleEl.id = "Loading-Overlay"
        document.head.appendChild(styleEl);
        let styleSheet = styleEl.sheet;
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
            '@keyframes spin {\n' +
            '  0% { transform: rotate(0deg); }\n' +
            '  100% { transform: rotate(360deg); }\n' +
            '}'
        )
        return styleEl;
    }
}