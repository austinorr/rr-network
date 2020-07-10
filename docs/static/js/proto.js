var TABLES = [];

class InitializationError extends Error {
    constructor(message) {
        super(message);
        this.name = "InitializationError";
    }
}

function toLabels(data) {
    // data must be formatted as csv with keys after region, group, and subgroup are values
    let first_row = Object.keys(data[0]);

    return first_row;
}

function getLabelFormatter(units) {
    if (units == "percent") {
        return d3.format('.1%');
    } else if (units == "count") {
        return d3.format(',.0f')
    } else if (units == "usd") {
        return function(d) { return "$" + d3.format(",d")(d); }
    }
}

window.onload = function() {
    onLoad();
};

function onLoad() {
    d3.selectAll(".filter-table").each(function(d) {
        let divId = this.getAttribute("id");
        let table = new Table(divId);
        try {
            table.init().catch(console.error);
        } catch (error) {
            if (error instanceof InitializationError) {
                console.error(error)
            }
        }
        TABLES.push(table)
    })
}


class Table {
    constructor(container_id) {
        this.container_id = container_id;
        this.container = d3.select("#" + container_id);
        this.url = this.container.attr("_data_source");
        this.options = {};
        this.filters = {};
        this.ignore_labels = ['value', 'units', 'data field']
    }

    init() {
        this.loadData();
    }

    resetOptions(data) {
        this.options = {};
        for (let label of this.labels) {
            if (!this.ignore_labels.includes(label.toLowerCase())) {
                this.options[label] = [...new Set(data.map(d => d[label].trim()))].filter(d=>d)
            }
        }
    }

    loadData() {
        let that = this;
        d3.csv(this.url, function(error, data) {
            if (error) throw error;
            that.raw_data = data.filter(d=>d['Value']); // drop missing
            that.labels = toLabels(data)

            that.resetOptions(data)
            that.drawOptions();
            that.viewData();
        });
    }

    drawOptions() {
        let that = this;

        let options_group = d3.selectAll(".options_group")
        if (options_group.empty()) {
            options_group = this.container.append('div').classed('options_group', true)
        }

        options_group.selectAll('.filter-options').remove();

        for (let key in this.options) {
            let gp = options_group
                .append('div')
                .classed('filter-options', true)
            let lab = gp
                .append('label')
                .attr('for', key)
                .text(key)
            let sel = gp
                .append('select')
                .attr('name', key)
                .on('change', function() {
                    let selection = this.options[this.selectedIndex].value;
                    if (that.filters[key] == 'undefined' | that.filters[key] == null) {
                        that.filters[key] = [];
                    }
                    that.filters[key][0] = selection;
                    that.selection = selection

                    let data = that.applyFilters(that.filters, that.raw_data)
                    that.resetOptions(data);
                    that.drawOptions();
                    that.viewData();
                })

            sel
                .append('option')
                .attr('value', '')

            let filtered_options = that.filters[key] || []

            for (let opt of this.options[key]) {
                let option = sel.append('option')
                    .attr('value', opt)
                    .text(opt)
                if (filtered_options.includes(opt)) {
                    option.attr('selected', '');
                }
            }
        }
    }

    applyFilters(filters, data) {
        let outdata = data;
        for (let key in filters) {
            for (let opt of filters[key]) {
                outdata = opt != "" ? outdata.filter(d => d[key] == opt) : outdata
            }
        }
        return outdata;
    }


    viewData() {
        this.container.selectAll('.tableview').remove()

        let data = this.applyFilters(this.filters, this.raw_data)
        this.data = data;

        let tableview = this.container
            .append('div')
            .classed('tableview', true)
            .append('table')


        let row = tableview.append('tr')
        for (let k in data[0]) {
            if (this.ignore_labels.includes(k.toLowerCase())) {
                row.append('td')
                    .text(k)
            }
        }

        for (let d of data) {
            row = tableview.append('tr')
            for (let k in d) {
                let txt = null;

                if (this.ignore_labels.includes(k.toLowerCase())) {
                    if (k.toLowerCase() == 'value') {
                        txt = getLabelFormatter(d["Units"])(d[k])
                    } else {
                        txt = d[k]
                    }
                    row.append('td')
                        .text(txt)

                }
            }
        }
    }
}
