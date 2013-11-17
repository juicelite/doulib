(function ($) {
    var ENUM_INSEARCH = 1;
    var ENUM_SEARCH_SUCCESS = 2;
    var ENUM_SEARCH_FAILED = 3;
    var ENUM_NO_RESERVE = 4;

    var g_SearchDict = {};

    $("li").filter(".subject-item").each(function (i) {
        // UI
        var div = $("div", this).filter(".opt-l")[0];
        var bookUrl = $("a", this).filter(function () {
            return $(this).attr("href").match("http://book.douban.com/subject/");
        }).attr("href");
        var libBtn = $("<span>&nbsp;&nbsp;<a>杭图馆藏</a><span>").find("a").attr("href", "javascript:;").end();
        $(libBtn).bind({
            "click": handleClickLibBtn,
            "mouseenter": handleMouseOverLibBtn
        });
        $(libBtn).appendTo(div);
        var resultDiv = null;

        // Data
        var searchResult = "";
        var toggleResult = false;

        function handleMouseOverLibBtn (e) {
            var flag = g_SearchDict[bookUrl];
            if(flag == null || flag == ENUM_SEARCH_FAILED) {
                g_SearchDict[bookUrl] = ENUM_INSEARCH;
                searchISBN(bookUrl);
            }
        }

        function handleClickLibBtn (e) {
            var flag = g_SearchDict[bookUrl];
            if (flag == ENUM_SEARCH_SUCCESS) {
                if(resultDiv == null) {
                    resultDiv = $("<span><div>" + searchResult + "</div></span>");
                }
                if (!toggleResult) {
                    $(resultDiv).appendTo(div);
                } else {
                    $(resultDiv).remove();
                }
                toggleResult = !toggleResult;
            };
        }

        function searchISBN (doubanBookUrl) {
            $.ajax({
                type: "GET",
                url: doubanBookUrl,
                dataType: "html",
                success: function (html, textStatus) {
                    searchZhlib(parseISBN(html));
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

        function searchZhlib (isbn) {
            $.ajax({
                type: "GET",
                url: "http://my1.hzlib.net/opac3/search?hasholding=1&searchWay=isbn&q=" + isbn,
                dataType: "html",
                success: function (html, textStatus) {
                    var recno = parseRecno(html);
                    if (recno != null) {
                        searchHoding(recno);
                    } else {
                        g_SearchDict[bookUrl] = ENUM_NO_RESERVE;
                        $(libBtn).find("a").text("没有馆藏").css({"color": "#e15c5c", "background-color": "#e3d3d3"});
                    }
                },
                error: function (xhr, textStatus, errorThrown) {
                    searchFailed();
                    alert("get recno failed!");
                }
            });
        }

        function parseRecno (txt) {
            var match = txt.match(/express_bookrecno="(\d+)"/);
            return (match && match.length > 1) ? match[1] : null;
        }

        function searchHoding (bookRecno) {
            $.ajax({
                type: "GET",
                url: "http://my1.hzlib.net/opac3/book/holdingpreview/" + bookRecno,
                dataType: "xml",
                success: function (xml, textStatus) {
                    g_SearchDict[bookUrl] = ENUM_SEARCH_SUCCESS;
                    var hodingInfo = parseHoding(xml);
                    searchResult = hodingInfo[0];
                    $("<span>&nbsp;" + hodingInfo[1] + "本&nbsp;</span>").css({"color": "#6cac49", "background-color": "#d0dbca"}).appendTo(div);
                },
                error: function (xhr, textStatusm, errorThrown) {
                    searchFailed();
                    alert("search hoding failed!");
                }
            });
        }

        function parseHoding (xml) {
            var hoding = [];
            var count = 0;
            $("records > record", xml).each(function (index) {
                var callno = $(this).find("callno").text();
                var libName = $(this).find("curlocalName").text();
                var copyCount = $(this).find("copycount").text();
                hoding[index] = "[  " + callno + "  ]  " + libName + "  可借数量: " + copyCount;
                count += parseInt(copyCount);
            });
            return [hoding.join("<br>"), count];
        }

        function searchFailed () {
            g_SearchDict[bookUrl] = ENUM_SEARCH_FAILED;
        }

    });
})(jQuery);