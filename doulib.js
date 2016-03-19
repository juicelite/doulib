(function ($) {
    var ENUM_NOSEARCH = 0;
    var ENUM_INSEARCH = 1;
    var ENUM_SEARCH_SUCCESS = 2;
    var ENUM_SEARCH_FAILED = 3;
    var ENUM_NO_RESERVE = 4;

    var g_ISBNs = {};

    $("li").filter(".subject-item").each(function (i) {
        // UI
        var div = $("div", this).filter(".opt-l")[0];
        var bookUrl = $("a", this).filter(function () {
            return $(this).attr("href").match("https://book.douban.com/subject/");
        }).attr("href");

        // Data
        var resultDiv = null;
        var toggleResult = false;
        var curLibBtn = null;

        // Lib button factory
        function createLibButton(label, color, searchUrl, holdingUrl, filterRe) {
            var searchStatus = ENUM_NOSEARCH;
            var searchResult = "";

            function handleMouseOverLibBtn (e) {
                if(searchStatus == ENUM_NOSEARCH || searchStatus == ENUM_SEARCH_FAILED) {
                    var isbn = g_ISBNs[bookUrl]
                    if(isbn == null) {
                        searchISBN(bookUrl);
                    } else {
                        searchLib(isbn);
                    }
                    searchStatus = ENUM_INSEARCH;
                }
            }

            function handleClickLibBtn (e) {
                if (searchStatus == ENUM_SEARCH_SUCCESS) {
                    if(curLibBtn != libBtn) {
                        if(resultDiv != null) {
                            $(resultDiv).remove();
                        }
                        resultDiv = $("<span><div>" + searchResult + "</div></span>");
                        $(resultDiv).appendTo(div);
                        toggleResult = true;
                        curLibBtn = libBtn;
                    } else {
                        if(!toggleResult) {
                            $(resultDiv).appendTo(div);
                        } else {
                            $(resultDiv).remove();
                        }
                        toggleResult = !toggleResult;
                    }
                }
            }

            function searchISBN (doubanBookUrl) {
                $.ajax({
                    type: "GET",
                    url: doubanBookUrl,
                    dataType: "html",
                    success: function (html, textStatus) {
                        var isbn = parseISBN(html);
                        g_ISBNs[doubanBookUrl] = isbn;
                        searchLib(isbn);
                    },
                    error: function (xhr, textStatus, errorThrown) {
                        searchFailed();
                        alert("failed");
                    }
                });
            }

            function parseISBN (txt) {
                return txt.match(/ISBN:\D+(\d+)/)[1];
            }

            function searchLib (isbn) {
                $.ajax({
                    type: "GET",
                    url: searchUrl + isbn,
                    dataType: "html",
                    success: function (html, textStatus) {
                        var recno = parseRecno(html);
                        if (recno != null) {
                            searchHolding(recno);
                        } else {
                            searchStatus = ENUM_NO_RESERVE;
                            $(libBtn).find("a").text(label + "没有").css({"color": "#e15c5c", "background-color": "#e3d3d3"});
                        }
                    },
                    error: function (xhr, textStatus, errorThrown) {
                        searchFailed();
                        alert("get recno failed! ");
                    }
                });
            }

            function parseRecno (txt) {
                var match = txt.match(/express_bookrecno="(\d+)"/);
                return (match && match.length > 1) ? match[1] : null;
            }

            function searchHolding (bookRecno) {
                $.ajax({
                    type: "GET",
                    url: holdingUrl + bookRecno,
                    dataType: "xml",
                    success: function (xml, textStatus) {
                        searchStatus = ENUM_SEARCH_SUCCESS;
                        var hodingInfo = parseHolding(xml);
                        searchResult = hodingInfo[0];
                        $("<span>&nbsp;(" + hodingInfo[1] + "本)&nbsp;</span>").css({"color": "#6cac49", "background-color": "#d0dbca"}).appendTo(libBtn);
                    },
                    error: function (xhr, textStatusm, errorThrown) {
                        searchFailed();
                        alert("search holding failed!");
                    }
                });
            }

            function parseHolding (xml) {
                var holding = [];
                var count = 0;
                $("records > record", xml).each(function (index) {
                    var callno = $(this).find("callno").text();
                    var libName = $(this).find("curlocalName").text();
                    var copyCount = $(this).find("copycount").text();
                    if(filterRe != null && filter(libName)) {
                        holding.unshift(formatHolding(callno, libName, copyCount, "#C45469"));
                    }
                    else {
                        holding.push(formatHolding(callno, libName, copyCount, "#000000"));
                    }
                    count += parseInt(copyCount);
                });
                return [holding.join("<br>"), count];
            }

            function formatHolding(id, name, copy, color) {
                return sprintf("『 %s 』   <span style=\"color:%s\">%s</span>    %s本", id, color, name, copy);
            }

            function filter(libName) {
                return libName.match(filterRe) != null
            }

            function searchFailed () {
                searchStatus = ENUM_SEARCH_FAILED;
            }

            var libBtn = $("<span>&nbsp;&nbsp;&nbsp;&nbsp;<a>" + label + "馆藏</a></span>").find("a").attr("href", "javascript:;").css({"color": color}).end();
            $(libBtn).bind({
                "click": handleClickLibBtn,
                "mouseenter": handleMouseOverLibBtn
            });
            return libBtn;
        }
        
        // Create Hangzhou lib button
        var hzlibBtn = createLibButton("杭图", "#8A9A46", "http://my1.hzlib.net/opac3/search?hasholding=1&searchWay=isbn&q=", "http://my1.hzlib.net/opac3/book/holdingpreview/", /浣纱|文献/gi)
        $(hzlibBtn).appendTo(div);

        // Create Zhejiang lib button
        var zjlibBtn = createLibButton("浙图", "#B49A46", "http://opac.zjlib.cn/opac/search?hasholding=1&searchWay=isbn&q=", "http://opac.zjlib.cn/opac/book/holdingpreview/")
        $(zjlibBtn).appendTo(div);

    });
})(jQuery);