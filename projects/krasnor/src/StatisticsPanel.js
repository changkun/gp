import { HalfedgeMeshStatistics } from './halfedge'


export class StatisticsPanel {

    constructor( panelName='',css_bottom='0px', css_left='0px', showPanelName = true, OmitSubdivisionCount= false) {
        this.panel = document.createElement('div');
        this.panelConent = document.createElement('div');
        this.panelHeader = document.createElement('div');


        this.omitSubdivisionCount = OmitSubdivisionCount;
        this.panelName = panelName;
        this.showPanelName = showPanelName;

        if(this.showPanelName){
            this.panelHeader.innerText = this.panelName;
            this.panel.appendChild(this.panelHeader);
        }
        this.panel.appendChild(this.panelConent);

        this._setStyle();
        this._setPositionOnScreen(css_bottom, css_left);
    }

    getDomElement(){
        return this.panel;
    }

    _setStyle(){
        let minWidth = "200px";
        let height = "100px";
        this.panel.style.minWidth = minWidth ;
        this.panel.style.position = "fixed";

        this.panel.style.opacity = '0.9';
        this.panel.style.background = "#1a1a1a";
        this.panel.style.color = "#eee";
        this.panel.style.fontFamily  = "Lucida Grande,sans-serif";

        this.panel.style.font = 'bold 16px Helvetica,Arial,sans-serif';
        this.panelConent.style.font = 'bold 12px Helvetica,Arial,sans-serif';

        this.panel.style.paddingLeft = "16px";
        this.panel.style.paddingLeft = "6px";
        this.panel.style.paddingTop = "6px";

        this.panelHeader.style.textDecoration  = "underline";

        console.log('window.devicePixelRatio: ' + window.devicePixelRatio)
    }

    _setPositionOnScreen(css_bottom, css_left){
        this.panel.style.bottom = css_bottom ;
        this.panel.style.left = css_left ;
    }

    /**
     *
     * @param {HalfedgeMeshStatistics} statistic
     */
    updateStatistics(statistic){
        let formatNumber = function(num){
            return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
        }
        let formatStats = function(stats, omit_subdivisions = false){
            let statsText = "<table style=\"width:100%\">";
            statsText += "<tr><td><b>Vertices </b></td> <td>" + formatNumber(stats.cnt_vertices) + "</td></tr>";
            statsText += "<tr><td><b>Edges </b></td> <td>" + formatNumber(stats.cnt_edges) + "</td></tr>";
            statsText += "<tr><td><b>Faces </b></td> <td>" + formatNumber(stats.cnt_faces) + "</td></tr>";

            if(!omit_subdivisions){
                statsText += "<tr><td><b>Subdivisions </b></td> <td>" + formatNumber(stats.subdivisions) + "</td></tr>";
            }else{
                statsText += "<tr><td><b>&nbsp;</b></td><td>&nbsp;</td></tr>";
            }

            return statsText;
        }
        this.panelConent.innerHTML = formatStats(statistic, this.omitSubdivisionCount);
    }


}