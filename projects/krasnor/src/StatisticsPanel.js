import {HalfedgeMeshStatistics} from './halfedge'


export class StatisticsPanel {

    /**
     *
     * @param {string} panelName
     * @param {string} css_bottom
     * @param {string} css_left
     * @param {boolean} showPanelName
     * @param {string} comparisonStyle 'none', 'numbers','percentage', 'percentage_increase'
     * @param {boolean} OmitSubdivisionCount
     */
    constructor(panelName = '', css_bottom = '0px', css_left = '0px', comparisonStyle = 'percentage_increase', showPanelName = true, OmitSubdivisionCount = false, showSubdivisionTime = false) {
        this.domElement = document.createElement('div');
        this.panelConent = document.createElement('div');
        this.panelHeader = document.createElement('div');

        // this.domElement.className = "statistics-panel";
        // this.panelConent.className = "statistics-panel-content";
        // this.panelHeader.className = "statistics-panel-header";

        this.omitSubdivisionCount = OmitSubdivisionCount;
        this.showSubdivisionTime = showSubdivisionTime;
        this.comparisonStyle = comparisonStyle;
        this.panelName = panelName;
        this.showPanelName = showPanelName;
        this.subdivisionTimeFormat = "hh:mm:ss.fff";

        if (this.showPanelName) {
            this.panelHeader.innerText = this.panelName;
            this.domElement.appendChild(this.panelHeader);
        }
        this.domElement.appendChild(this.panelConent);

        this._setStyle();
        this._setPositionOnScreen(css_bottom, css_left);
    }

    getDomElement() {
        return this.domElement;
    }

    _setStyle() {
        let minWidth = "225px";
        let minHeight = "100px";
        this.domElement.style.minWidth = minWidth;
        this.domElement.style.minHeight = minHeight;
        this.domElement.style.position = "fixed";

        this.domElement.style.opacity = '0.94';
        this.domElement.style.background = "#1a1a1a";
        this.domElement.style.color = "#eee";
        this.domElement.style.fontFamily = "Lucida Grande,sans-serif";

        this.domElement.style.font = 'bold 16px Helvetica,Arial,sans-serif';
        this.panelConent.style.font = '12px Helvetica,Arial,sans-serif';

        this.domElement.style.paddingLeft = "16px";
        this.domElement.style.paddingLeft = "6px";
        this.domElement.style.paddingTop = "6px";

        // this.panel.style.border = "2px solid #2c2c2c";

        this.panelHeader.style.textDecoration = "underline";
    }

    _setPositionOnScreen(css_bottom, css_left) {
        this.domElement.style.bottom = css_bottom;
        this.domElement.style.left = css_left;
    }

    /**
     *
     * @param {HalfedgeMeshStatistics} statistic
     */
    updateStatistics(statistic, compareToStatistic = null) {
        /**
         * formats number or string
         * e.g. formatNumber(123456) => "123,456"
         * e.g. formatNumber(123456.789) => "123,456.789"
         *
         * @param {number|string} num
         * @returns {string}
         */
        const formatNumber = function (num) {
            return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
        }
        /**
         * Calculates the percentage of a to b.
         * E.g "40 is 400% of 10"
         * @param {number} a
         * @param {number} b
         * @returns {string} percentage e.g. '400.00'
         */
        const percentage = function (a, b, fractionDigits = 2) {
            return (a / b * 100).toFixed(fractionDigits);
        }
        /**
         * Calculates the increase from b to a
         * Example "The increase from 40 to 10 is 300%"
         * @param {number} a
         * @param  {number} b
         * @returns {string} percentage e.g. '300.00'
         */
        const percentageIncrease = function (a, b, fractionDigits = 2) {
            return ((a - b) / b * 100).toFixed(fractionDigits)
        }
        const makeCompareStatColumn = function (stats, comparisonStats, field, comparisonStyle = 'increase') {
            if (compareToStatistic == null) {
                return '';
            } else {
                switch (comparisonStyle) {
                    case 'percentage_increase':
                        let d_perc_incr = formatNumber(percentageIncrease(stats[field], comparisonStats[field]));
                        return `<td>/ <i>+${d_perc_incr}&#37;</i> </td>`;
                    case 'percentage':
                        let d_percentage = formatNumber(percentage(stats[field], comparisonStats[field]));
                        return `<td>/ <i>&nbsp;${d_percentage}&#37;</i></td>`;
                    case 'numbers':
                        return `<td>/ <i>${formatNumber(comparisonStats[field])}</i></td>`;
                    case 'numbers_increase':
                        return `<td>/ <i>+${formatNumber(stats[field] - comparisonStats[field])}</i></td>`;
                    case 'none':
                    default:
                        return '';
                }
            }
        }

        let stats = statistic;
        let comparisonStats = compareToStatistic;
        let comparisonStyle = this.comparisonStyle;
        let omit_subdivisions = this.omitSubdivisionCount;
        let showSubdivisionTime = this.showSubdivisionTime;
        let subdivisionTimeFormat = this.subdivisionTimeFormat;

        let statsText = `<table style=\"width:100%\">`;
        statsText += `<tr><td><b>Vertices </b></td> <td><b>${formatNumber(stats.cnt_vertices)}</b></td> ${makeCompareStatColumn(stats, comparisonStats, 'cnt_vertices', comparisonStyle)}</tr>`;
        statsText += `<tr><td><b>Edges </b></td>    <td><b>${formatNumber(stats.cnt_edges)}</b></td>    ${makeCompareStatColumn(stats, comparisonStats, 'cnt_edges', comparisonStyle)}</tr>`;
        statsText += `<tr><td><b>Faces </b></td>    <td><b>${formatNumber(stats.cnt_faces)}</b></td>    ${makeCompareStatColumn(stats, comparisonStats, 'cnt_faces', comparisonStyle)}</tr>`;

        if (!omit_subdivisions) {
            statsText += `<tr><td><b>Subdivisions </b></td> <td colspan="2"><b> ${formatNumber(stats.subdivisions)}</b></td></tr>`;
        } else {
            statsText += "<tr><td><b>&nbsp;</b></td><td>&nbsp;</td></tr>";
        }
        if (showSubdivisionTime) {
            statsText += `<tr><td><b>Time </b></td><td colspan="2" title="${subdivisionTimeFormat}" ><b>${stats.formatElapsedTime(stats.subdivisionTimeMs, subdivisionTimeFormat)}</b></td></tr>`;
        }

        this.panelConent.innerHTML = statsText;
    }


}