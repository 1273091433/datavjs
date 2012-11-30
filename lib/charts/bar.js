/*global Raphael, d3, $, define, _ */
/*!
 * Columnͼ�ļ����Զ���
 */
;(function (name, definition) {
  if (typeof define === 'function') { // Module
    define(definition);
  } else { // Assign to common namespaces or simply the global object (window)
    this[name] = definition(function (id) { return this[id];});
  }
})('Bar', function (require) {
  var DataV = require('DataV');

  /**
   * Column���캯��
   * Creates Bar in a DOM node with id "chart", default width is 522; height is 522px;
   * Options:
   *
   * - `width` ��ȣ�Ĭ��Ϊ�ڵ���
   * - `xBase` ������Ļ���ֵ���е���0Ϊ��ʼֵ���е����������е���СֵΪ��ʼֵ
   * - `gap` ������֮��ķ�϶���
   *
   * Examples:
   * ```
   * var bar = new Bar("chart", {"width": 500, "height": 600, "typeNames": ["Y", "Z"]});
   * ```
   * @param {Mix} node The dom node or dom node Id
   * @param {Object} options options json object for determin bar style.
   */
  var Bar = DataV.extend(DataV.Chart, {
    initialize: function (node, options) {
      this.type = "Bar";
      this.node = this.checkContainer(node);

      /**
       * ��γ��
       */
      this.dimension.bar = {
        type: "string",
        required: true,
        index: 0
      };
      /**
       * ����γ��
       */
      this.dimension.x = {
        type: "string",
        required: true,
        index: 1
      };
      /**
       * ֵγ��
       */
      this.dimension.value = {
        type: "number",
        required: true,
        index: 2
      };

      this.defaults.typeNames = [];
      // canvas parameters
      this.defaults.width = 522;
      this.defaults.height = 522;
      this.defaults.margin = 50;
      this.defaults.gap = 15;
      this.defaults.circleR = 3;
      this.defaults.barColor = ["#308BE6","#8EEC00","#DDDF0D"];
      this.defaults.xTickNumber = 5;
      this.defaults.yTickNumber = 5;

      this.defaults.xBase = undefined;

      //ͼ����������϶�������x��y������
      this.defaults.legendArea = [422, 50, 472, 220];
      //ɢ�������������϶�������x��y������
      this.defaults.diagramArea = [50, 50, 422, 472];
      this.barSet = [];

      this.setOptions(options);
      this.createCanvas();
      this.initEvents();
    }
  });

  /**
   * ��������
   */
  Bar.prototype.createCanvas = function () {
    var conf = this.defaults;
    this.node.style.position = "relative";
    this.canvas = new Raphael(this.node, conf.width, conf.height);
  };

  Bar.prototype.initEvents = function () {
    var that = this;
    this.on('legendOver', function (barIndex) {
      that.barSet.forEach(function (set, index) {
        if (index !== barIndex) {
          set.attr({
            "fill-opacity": 0.3
          });
        }
      });
    });

    this.on('legendOut', function (barIndex) {
      that.barSet.forEach(function (set, index) {
        set.attr({
          "fill-opacity": 1
        });
      });
    });

    this.on('legendClick', function (clicked, barIndex) {
      that.clicked = clicked;
      that.clickedColumnIndex = barIndex;
      that.barSet.forEach(function (set, index) {
        if (index !== barIndex) {
          if (clicked) {
            set.attr({"fill-opacity": 0.1});
          } else {
            set.attr({"fill-opacity": 0.5});
          }
        } else {
          set.attr({"fill-opacity": 1});
        }
      });
    });
  };

  /**
   * ��������Դ
   * Examples��
   * ```
   * bar.setSource(source);
   * ```
   * @param {Array} source ����Դ ��һ��Ϊ�Ų���x������ݣ���n��Ϊ�Ų���y�������
   */
  Bar.prototype.setSource = function (source, map) {
    var conf = this.defaults;
    map = this.map(map);
    var dataTable;
    if (DataV.detect(source) === 'Table_WITH_HEAD') {
      dataTable = DataV.collectionify(source);
    } else {
      dataTable = source;
    }
    this.bars = _.groupBy(dataTable, map.bar);
    this.barCount = _.keys(this.bars).length;

    conf.yAxisData = _.pluck(_.first(_.values(this.bars)), map.x);
    conf.yTickNumber = Math.min(conf.yAxisData.length, conf.yTickNumber);
    // ������ķ�Χ
    conf.xExtent = d3.extent(dataTable, function (item) {
      return item[map.value];
    });
    // ���������ֵ
    if (conf.xBase !== undefined) {
      conf.xExtent.push(conf.xBase);
      conf.xExtent = d3.extent(conf.xExtent);
    }
  };

  /**
   * ����������
   */
  Bar.prototype.setAxis = function () {
    var conf = this.defaults;
    var tagWidth = conf.width / 5 > 50 ? 50 : conf.width / 5;
    conf.legendArea = [conf.width - tagWidth - conf.margin, 0, conf.width, conf.height];
    conf.diagramArea = [0, 0, conf.width - tagWidth - conf.margin, conf.height];
    var w = conf.diagramArea[2] - 2 * conf.margin;
    var h = conf.diagramArea[3] - conf.margin;

    //����x��
    this.value = d3.scale.linear().domain(conf.xExtent).range([conf.margin, w]);
    //����y��
    this.y = d3.scale.linear().domain([0, conf.yAxisData.length]).range([h, conf.margin]);
    var valueRange = this.value.range();
    var yRange = this.y.range();
    var axis = this.axisPosition = {
      left: valueRange[0],
      right: valueRange[1],
      up: yRange[1],
      down: yRange[0]
    };
    var barsMaxLen = _.max(this.bars, function (bar) {
      return bar.length;
    }).length;
    this.barWidth = (axis.down - axis.up - barsMaxLen * conf.gap) / barsMaxLen / _.keys(this.bars).length;
  };

  /**
   * ��������
   */
  Bar.prototype.drawAxis = function () {
    var that = this;
    var conf = this.defaults;
    var paper = this.canvas;
    var i, j, k, l;
    //��������
    var axisLines = paper.set();
    var tickText = paper.set();
    var axis = this.axisPosition;
    var ticks;
    // X��
    ticks = this.value.ticks(conf.xTickNumber);
    for (j = 0; j < ticks.length; j++) {
      tickText.push(paper.text(this.value(ticks[j]), axis.down + 14, ticks[j]).attr({
        "fill": "#878791",
        "fill-opacity": 0.7,
        "font-size": 12,
        "text-anchor": "middle"
      }).rotate(0, axis.right + 6, this.value(ticks[j])));
      axisLines.push(paper.path("M" + this.value(ticks[j]) + "," + axis.down + "L" + this.value(ticks[j]) + "," + (axis.down + 5)));
    }
    axisLines.push(paper.path("M" + axis.left + "," + axis.up + "L" + axis.left + "," + axis.down));
    axisLines.attr({
      "stroke": "#D7D7D7",
      "stroke-width": 2
    });

    var numOfHLine = d3.round((axis.down - axis.up) / 30 - 1);
    var hLines = paper.set();
    for (j = 1; j <= numOfHLine; j++) {
      var hLinesPos = axis.right - j * 30;
      hLines.push(paper.path("M" + hLinesPos + "," + axis.up + "L" + hLinesPos + "," + axis.down));
    }
    hLines.attr({
      "stroke": "#ECECEC",
      "stroke-width": 1
    });
    
    //Y��
    ticks = this.y.ticks(conf.yTickNumber);
    console.log(ticks);
    var range = this.y.range();

    // �޸���ʾ���ӵ�һ��x�ᵥλ��ʾ��bug
    for (j = 0; j < ticks.length; j++) {
      // �޸�x�ᵥλ��ʾ������Column����м�λ��
      // �޸�x�ᵥλ������λ�õ�ƫ��
      var y = this.y(ticks[j]) - conf.gap / 2 - this.barCount * Math.floor(this.barWidth) / 2;
      tickText.push(paper.text(axis.left - 10, y, conf.yAxisData[ticks[j]]).rotate(45, axis.left - 10, y).attr({
          "fill": "#878791",
          "fill-opacity": 0.7,
          "font-size": 12,
          "text-anchor": "end"
        }));
      axisLines.push(paper.path("M" + axis.left + "," + y + "L" + (axis.left - 5) + "," + y));
    }

    tickText;
    axisLines.push(paper.path("M" + axis.left + "," + axis.down + "L" + axis.right + "," + axis.down));
    axisLines.attr({
      "stroke": "#D7D7D7",
      "stroke-width": 2
    });
  };

  /**
   * ������״ͼ�Ļ���
   */
  Bar.prototype.drawDiagram = function () {
    var that = this;
    var conf = this.defaults;
    var axis = this.axisPosition;
    var paper = this.canvas;
    var dim = that.dimension;
    //bars
    var barWidth = this.barWidth;
    var barCount = this.barCount;
    var barSet = this.barSet;
    var values = _.values(this.bars);
    var tagSet = paper.set();

    //bars
    var mouseOverBar = function (event) {
      var barIndex = this.data('bar');
      var xIndex = this.data('index');
      if (that.clicked && that.clickedColumnIndex !== barIndex) {
        return;
      }
      tagSet.remove();
      var currentSet = barSet.filter(function (set, barIndex) {
        return that.clicked ? that.clickedColumnIndex === barIndex : true;
      });
      currentSet.forEach(function (set, barIndex) {
        set.animate({
          "fill-opacity": 0.3
        }, 10);
        set[xIndex].animate({
          "fill-opacity":1
        }, 10);
      });

      var hovered = currentSet.map(function (set) {
        return set[xIndex];
      });
      var xPos = _.max(hovered, function (item) {
        return item.attrs.x;
      }).attrs.x + barWidth + 8;

      var y = _.map(hovered, function (item) {
        return item.attrs.y;
      });
      // TODO: �������㷨
      for (var i = 1; i < y.length; i++) {
        for (var j = i - 1; j >= 0; j--) {
          var overlapped = y.filter(function (item, index) {
            return index < i && Math.abs(item - y[i]) < 20;
          });
          if (overlapped.length > 0) {
            var extent = d3.extent(overlapped);
            if (y[i] <= extent[0]) {
              y[i] = extent[0] - 20;
            } else {
              y[i] = extent[1] + 20;
            }
          }
        }
      }
      hovered.forEach(function (item, barIndex) {
        var yPos = y[barIndex];
        var valueLabel = '' + values[barIndex][xIndex][dim.value.index];
        var textWidth = 5 * valueLabel.length + 20;

        var rect = paper.rect(xPos, yPos - 10, textWidth, 20, 2).attr({
          "fill": conf.barColor[barIndex],
          "fill-opacity": 1,
          "stroke": "none"
        });
        var path = paper.path("M" + xPos + "," + (yPos - 4) + "L" + (xPos - 8) + "," + yPos + "L" + xPos + "," + (yPos + 4) + "V" + yPos + "Z").attr({
          "fill" : conf.barColor[barIndex],
          "stroke" : conf.barColor[barIndex]
        });
        var text = paper.text(xPos + 16, yPos, valueLabel).attr({
          "fill": "#ffffff",
          "fill-opacity": 1,
          "font-weight": "bold",
          "font-size": 12,
          "text-anchor": "middle"
        });
        tagSet.push(rect, path, text);
      });

      xPos = hovered.reduce(function (pre, cur) {
        return pre + cur.attrs.x;
      }, 0) / hovered.length + barWidth / 2;
      var xLabel = '' + values[barIndex][xIndex][dim.x.index];
      var textWidth = 6 * xLabel.length + 20;
      //axis x rect
      var rect = paper.rect(xPos - textWidth / 2, axis.down + 8, textWidth, 20, 2).attr({
        "fill": "#5f5f5f",
        "fill-opacity": 1,
        "stroke": "none"
      });
      // axis x text
      var text = paper.text(xPos, axis.down + 18, xLabel).attr({
        "fill": "#ffffff",
        "fill-opacity": 1,
        "font-weight": "bold",
        "font-size": 12,
        "text-anchor": "middle"
      });
      var arrow = paper.path("M" + (xPos - 4) + "," + (axis.down + 8) + "L" + xPos + "," + axis.down +
          "L" + (xPos + 4) + "," + (axis.down + 8) + "H" + xPos + "Z").attr({
          "fill": "#5F5F5F",
          "stroke": "#5F5F5F"
      });
      tagSet.push(rect, text, arrow);
    };

    var mouseOutBar = function (event) {
      var barIndex = this.data('bar');
      var xIndex = this.data('index');
      var currentSet = barSet.filter(function (set, barIndex) {
        return that.clicked ? that.clickedColumnIndex === barIndex : true;
      });
      tagSet.animate({"opacity": 0}, 1000, function () {
        tagSet.remove();
      });
      currentSet.forEach(function (set, barIndex) {
        set.attr({"fill-opacity": 1});
      });
    };

    values.forEach(function (bar, index) {
      barSet[index] = paper.set();
      bar.forEach(function (row, i) {
        var value = row[dim.value.index];
        var height = that.value(value);
        var y = that.y(i);
        var rect = paper.rect(axis.left, y - barWidth * (index + 1) - conf.gap / 2, height, barWidth).attr({
          "fill": conf.barColor[index],
          "fill-opacity": 1,
          "stroke": "none"
        });
        rect.data('bar', index).data('index', i);
        rect.mouseover(mouseOverBar);
        rect.mouseout(mouseOutBar);
        barSet[index].push(rect);
      });
    });
  };

  /**
   * ����ͼ��
   */
  Bar.prototype.drawLegend = function () {
    var that = this;
    var paper = this.canvas;
    var legendSet = paper.set();
    var bgSet = paper.set();
    var conf = this.defaults;
    var legendArea = conf.legendArea;
    var barCount = this.barCount;
    //legend
    var mouseOverLegend = function (event) {
      if (legendSet.clicked) {
        return;
      }
      bgSet[this.data('type')].attr({
        "fill-opacity":0.5
      });
      that.fire('legendOver', this.data('type'));
    };

    var mouseOutLegend = function (event) {
      if (legendSet.clicked) {
        return;
      }
      bgSet[this.data('type')].attr({"fill-opacity": 0});
      that.fire('legendOut', this.data('type'));
    };

    var clickLegend = function (event) {
      if (legendSet.clicked && legendSet.clickedColumn === this.data('type')) {
        legendSet.clicked = false;
      } else {
        legendSet.clicked = true;
        legendSet.clickedColumn = this.data('type');
      }
      bgSet.attr({"fill-opacity": 0});
      bgSet[this.data('type')].attr({
        "fill-opacity": legendSet.clicked ? 1 : 0
      });
      that.fire('legendClick', legendSet.clicked, this.data('type'));
    };

    var labels = _.keys(this.bars);
    for (var i = 0; i < labels.length; i++) {
      //�׿�
      bgSet.push(paper.rect(legendArea[0] + 10, legendArea[1] + 10 + (20 + 3) * i, 180, 20).attr({
        "fill": "#ebebeb",
        "fill-opacity": 0,
        "stroke": "none"
      }));
      // ɫ��
      paper.rect(legendArea[0] + 10 + 3, legendArea[1] + 10 + (20 + 3) * i + 6, 16, 8).attr({
        "fill": conf.barColor[i],
        "stroke": "none"
      });
      // ����
      paper.text(legendArea[0] + 10 + 3 + 16 + 8, legendArea[1] + 10 + (20 + 3) * i + 10, labels[i]).attr({
        "fill": "black",
        "fill-opacity": 1,
        "font-family": "Verdana",
        "font-size": 12,
        "text-anchor": "start"
      });
      // ѡ��
      var rect = paper.rect(legendArea[0] + 10, legendArea[1] + 10 + (20 + 3) * i, 180, 20).attr({
        "fill": "white",
        "fill-opacity": 0,
        "stroke": "none"
      }).data("type", i);
      rect.mouseover(mouseOverLegend);
      rect.mouseout(mouseOutLegend);
      rect.click(clickLegend);
      legendSet.push(rect);
    }
  };

  /**
   * ������״ͼ
   * Options:
   *
   *   - `width` ��ȣ�Ĭ��Ϊ�ڵ���
   *   - `typeNames` ָ��y����������Ŀ
   *
   * Examples:
   * ```
   * bar.render({"width": 1024})
   * ```
   * @param {Object} options options json object for determin bar style.
   */
  Bar.prototype.render = function (options) {
    this.setOptions(options);
    this.canvas.clear();
    this.setAxis();
    this.drawAxis();
    this.drawDiagram();
    this.drawLegend();
  };
    /*!
     * ����
     */
  return Bar;
});
