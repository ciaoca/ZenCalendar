# ZenCalendar 禅日历
使用 CSS 样式设计，制作丰富的主题日历。

https://ciaoca.github.io/ZenCalendar/



## 创作起源

> 起初是想做一个用来打印的日历，在校时曾经用 PS 设计过台历，想到现在能用 JavaScript 生成日历，再使用 CSS 美化，岂不是能方便很多。
> 
> 开发过程中，想起早期学习 CSS 时看到的《禅意花园》，就想开源吧，给更多人使用以及一起创作，成为禅意日历。




## 主题声明注释
在 `layout.css` 文件头部使用注释进行声明。

| 名称         | 说明                          |
| ------------ | ----------------------------- |
| @name        | 主题名称                      |
| @author      | 作者                          |
| @email       | 联系邮箱                      |
| @description | 简介                          |
| @printMode   | 打印模式，多个值使用 `,` 分隔 |

示例：

```css
/**
 * @name 主题名称
 * @author 作者
 * @email 联系邮箱
 * @description 简介
 */
```



## 打印模式

若有声明 `@printMode` ，加载主题后可选择打印模式。

> 注释中的名称即作为选项名称（最后一位字母若是 `H` 会转换为 `横向` ）；
> 
> 选择对应模式后，会在 `<body>` 添加 `class` （名称会被转换为小写）。

示例：

- `A4` : 选项名称为 `A4`，样式为 `<body class="print a4">` 
- `A5H` : 选项名称为 `A5 横向`，样式为 `<body class="print a5h">` 

```css
/**
 * @printMode A3,A4,A5H
 */
body.print.a3{}
body.print.a4{}
body.print.a5h{}
```

