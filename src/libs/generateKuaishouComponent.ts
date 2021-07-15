import fs from 'fs';
import path, { basename } from 'path';
import mkdirp from 'mkdirp';
import glob from 'glob';
import colors from 'colors';
import { Config } from './getConfig';
import { XmlData } from './fetchXml';
import { getTemplate } from './getTemplate';
import {
  replaceNames,
  replaceSize,
  replaceIsRpx,
  replaceHexToRgb
} from './replace';

const ATTRIBUTE_FILL_MAP = ['path'];

export const generateKuaishouComponent = (data: XmlData, config: Config) => {
  const names: string[] = [];
  const svgTemplates: string[] = [];

  const saveDir = path.resolve(config.save_dir);
  const fileName = basename(config.save_dir) || 'iconfont';

  mkdirp.sync(saveDir);
  glob.sync(path.join(saveDir, '*')).forEach((file) => fs.unlinkSync(file));

  data.svg.symbol.forEach((item) => {
    const iconId = item.$.id;
    const iconIdAfterTrim = config.trim_icon_prefix
      ? iconId.replace(
        new RegExp(`^${config.trim_icon_prefix}(.+?)$`),
        (_, value) => value.replace(/^[-_.=+#@!~*]+(.+?)$/, '$1')
      )
      : iconId;

    names.push(iconIdAfterTrim);
    svgTemplates.push(
      `<!--${iconIdAfterTrim}-->\n<view ks:if="{{name === '${iconIdAfterTrim}'}}" style="background-image: url({{quot}}data:image/svg+xml, ${generateCase(item)}{{quot}});` +
      ' width: {{svgSize}}px; height: {{svgSize}}px;" class="icon" />'
    );

    console.log(`${colors.green('√')} Generated icon "${colors.yellow(iconId)}"`);
  });

  fs.writeFileSync(path.join(saveDir, fileName + '.ksml'), svgTemplates.join('\n\n'));
  fs.writeFileSync(path.join(saveDir, fileName + '.css'), getTemplate('kuaishou.css'));
  fs.writeFileSync(path.join(saveDir, fileName + '.json'), getTemplate('kuaishou.json'));

  let jsFile = getTemplate('kuaishou.js');
  jsFile = replaceNames(jsFile, names);
  jsFile = replaceSize(jsFile, config.default_icon_size);
  jsFile = replaceIsRpx(jsFile, config.use_rpx);
  fs.writeFileSync(path.join(saveDir, fileName + '.js'), jsFile);

  console.log(`\n${colors.green('√')} All icons have been putted into dir: ${colors.green(config.save_dir)}\n`);
};

const generateCase = (data: XmlData['svg']['symbol'][number]) => {
  let template = `<svg viewBox='${data.$.viewBox}' xmlns='http://www.w3.org/2000/svg' width='{{svgSize}}px' height='{{svgSize}}px'>`;

  for (const domName of Object.keys(data)) {
    if (domName === '$') {
      continue;
    }

    const counter = {
      colorIndex: 0,
    };

    if (data[domName].$) {
      template += `<${domName}${addAttribute(domName, data[domName], counter)} />`;
    } else if (Array.isArray(data[domName])) {
      data[domName].forEach((sub) => {
        template += `<${domName}${addAttribute(domName, sub, counter)} />`;
      });
    }
  }

  template += `</svg>`;

  return template.replace(/<|>/g, (matched) => encodeURI(matched));
};

const addAttribute = (domName: string, sub: XmlData['svg']['symbol'][number]['path'][number], counter: { colorIndex: number }) => {
  let template = '';

  if (sub && sub.$) {
    if (ATTRIBUTE_FILL_MAP.includes(domName)) {
      // Set default color same as in iconfont.cn
      // And create placeholder to inject color by user's behavior
      sub.$.fill = sub.$.fill || '#333333';
    }

    for (const attributeName of Object.keys(sub.$)) {
      if (attributeName === 'fill') {
        const color = replaceHexToRgb(sub.$[attributeName]);

        template += ` ${attributeName}='{{(isStr ? colors : colors[${counter.colorIndex}]) || '${color}'}}'`;
        counter.colorIndex += 1;
      } else {
        template += ` ${attributeName}='${sub.$[attributeName]}'`;
      }
    }
  }

  return template;
};
