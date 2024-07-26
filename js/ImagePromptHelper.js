let iphData = {};
let iphCurrentPath = [];
let iphSelectedTagGroups = [];
let iphSelectedImages = [];
let iphImageCache = new Map();
let iphImageWrappers = [];

document.addEventListener('DOMContentLoaded', iphInitializeUI);

function iphInitializeUI() {
  const languageDropdown = document.getElementById('iph-language-dropdown');
  const modelDropdown = document.getElementById('iph-model-dropdown');
  languageDropdown.addEventListener('change', iphLoadJsonAndRefresh);
  modelDropdown.addEventListener('change', iphLoadJsonAndRefresh);

  iphLoadJsonAndRefresh();

  document.getElementById('iph-download-button').addEventListener('click', () => {
    if (iphSelectedTagGroups.length > 0) {
      const content = iphSelectedTagGroups.join(',');
      const blob = new Blob([content], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'selected_tags.txt';
      a.click();
    }
  });

  document.getElementById('iph-copy-button').addEventListener('click', () => {
    if (iphSelectedTagGroups.length > 0) {
      const content = iphSelectedTagGroups.join(',');
      navigator.clipboard.writeText(content).then(() => {
      }).catch(err => {
        console.error('クリップボードへのコピーに失敗しました:', err);
      });
    }
  });
}

function iphLoadJsonAndRefresh() {
  iphLoadLocalStorage()
    .then(() => iphLoadJson())
    .then(() => {
      iphRefreshUI();
    });
}

function iphLoadLocalStorage() {
  return new Promise((resolve) => {
    const customSetJson = localStorage.getItem('CustomSet');
    if (customSetJson) {
      const customSet = JSON.parse(customSetJson);

      console.log("iphLoadLocalStorage customSet", customSet);

      if (customSet && customSet['Custom Set']) {
        iphData['Custom Set'] = {};

        console.log("iphLoadLocalStorage customSet['Custom Set']", JSON.stringify(customSet['Custom Set']));
        Object.entries(customSet['Custom Set']).forEach(([name, content]) => {
          console.log("iphLoadLocalStorage name", name);
          console.log("iphLoadLocalStorage content", JSON.stringify(content));

          console.log("iphLoadLocalStorage content.url", content.url);
          console.log("iphLoadLocalStorage content.alias", content.alias);

          iphData['Custom Set'][name] = {
            url: content.url,
            alias: content.alias
          };

          console.log("iphLoadLocalStorage iphData['Custom Set'][name]", JSON.stringify(iphData['Custom Set'][name]));
        });
      }
    }
    resolve();
  });
}

function iphRefreshUI() {
  iphCurrentPath = [];
  iphSelectedTagGroups = [];
  iphSelectedImages = [];
  iphShowTag1();
  iphUpdateSelectedTagsDisplay();
  iphUpdateImageDisplay();
}

function iphLoadJson() {
  const language = document.getElementById('iph-language-dropdown').value;
  const model = document.getElementById('iph-model-dropdown').value.toLowerCase();

  return Promise.all([
    fetch(`json/00_base.json`).then(response => response.json()),
    fetch(`json/00_prompt_${model}_base.json`).then(response => response.json())
  ])
  .then(([baseJson, modelJson]) => {
    iphData = { ...iphData, ...modelJson, ...baseJson };
    if (language === 'en') {
      iphData = iphFilterEnglishData(iphData);
    }

    console.log('Loaded data:', iphData);
  })
  .catch(error => console.error('Error loading JSON:', error));
}

function iphFilterEnglishData(data) {
  const filteredData = {};
  for (const key in data) {
    if (key === 'hr') {
      filteredData[key] = data[key];
    } else if (data[key].hasOwnProperty('en')) {
      filteredData[data[key].en] = iphFilterEnglishData(data[key]);
    } else if (typeof data[key] === 'object' && !Array.isArray(data[key])) {
      filteredData[key] = iphFilterEnglishData(data[key]);
    } else {
      filteredData[key] = data[key];
    }
  }
  return filteredData;
}

function iphShowTag1() {
  const tag1Container = document.getElementById('iph-category-container');
  tag1Container.innerHTML = '';
  let hrCount = 0;
  Object.keys(iphData).forEach(tag => {
    if (tag.startsWith('horizontalLine')) {
      const hr = document.createElement('hr');
      tag1Container.appendChild(hr);
      hrCount++;
      console.log(`HR added (${hrCount})`);
    } else {
      const button = iphCreateButton(tag, 1);
      console.log("custom tag", tag);
      console.log("custom iphData[tag]", JSON.stringify(iphData[tag]));
      button.addEventListener('click', () => iphSelectTag(tag, 0, iphData[tag]));
      tag1Container.appendChild(button);
    }
  });
}

function iphCreateButton(text, level, url, alias, isCustomSet = false) {
  const button = document.createElement('button');
  button.classList.add('iph-tag-button', `iph-tag${level}-button`);
  
  if (url) {
    const placeholder = document.createElement('div');
    placeholder.classList.add('iph-image-placeholder');
    placeholder.textContent = '読み込み中';
    
    button.appendChild(placeholder);

    iphLoadImage(url).then(img => {
      placeholder.remove();
      button.insertBefore(img, button.firstChild);
    }).catch(() => {
      placeholder.textContent = '画像を読み込めません';
    });

    if (isCustomSet) {
      button.classList.add('iph-custom-set-button');
      const removeButton = document.createElement('span');
      removeButton.classList.add('iph-remove-custom-set');
      removeButton.innerHTML = '✕';
      removeButton.onclick = (e) => {
        console.log("removeButton start1");
        e.stopPropagation();
        console.log("removeButton start2");
        e.preventDefault();
        console.log("removeButton start3");
        iphRemoveCustomSetItem(text);
        console.log("removeButton start4");
      };
      button.appendChild(removeButton);
    }
  }
  console.trace();
  const span = document.createElement('span');
  console.log("alias", alias);
  if (alias) {
    span.textContent = alias;
  } else {
    span.textContent = text;
  }
  button.appendChild(span);
  return button;
}

function iphLoadImage(url) {
  if (iphImageCache.has(url)) {
    return Promise.resolve(iphImageCache.get(url).cloneNode());
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      iphImageCache.set(url, img);
      resolve(img.cloneNode());
    };
    img.onerror = reject;
    img.src = url;
    img.alt = "";
  });
}

function iphShowTags(currentData, level) {
  const tagLevels = document.getElementById('iph-sub-category-container');

  while (tagLevels.children.length > level) {
    tagLevels.removeChild(tagLevels.lastChild);
  }

  const levelContainer = document.createElement('div');
  console.log("iphShowTags currentData", currentData);
  const buttons = Object.keys(currentData).map(tag => {

    console.log("iphShowTags tag", tag);

    const tagData = currentData[tag];
    console.log("iphShowTags tagData", JSON.stringify(tagData));

    const url = tagData.url || (typeof tagData === 'object' && tagData.hasOwnProperty('url') ? tagData.url : null);
    const alias = tagData.alias || (typeof tagData === 'object' && tagData.hasOwnProperty('alias') ? tagData.alias : null);
    const isCustomSet = iphCurrentPath[0] === 'Custom Set';
    const button = iphCreateButton(tag, level + 1, url, alias, isCustomSet);
    button.addEventListener('click', () => iphSelectTag(tag, level, tagData));
    return button;
  });

  Promise.all(buttons.map(button => {
    const img = button.querySelector('img');
    return img ? iphLoadImage(img.src) : Promise.resolve();
  })).then(() => {
    buttons.forEach(button => levelContainer.appendChild(button));
    tagLevels.appendChild(levelContainer);
  });
}

function iphSelectTag(tag, level, data) {
  const tagLevels = document.getElementById('iph-sub-category-container');
  while (tagLevels.children.length > level) {
    tagLevels.removeChild(tagLevels.lastChild);
  }

  iphCurrentPath = iphCurrentPath.slice(0, level);
  iphCurrentPath.push(tag);

  if (typeof data === 'object' && !data.hasOwnProperty('url')) {
    console.log("iphSelectTag data", data);
    iphShowTags(data, level + 1);
  } else {
    iphFinishSelection(tag, data);
  }
}

function iphFinishSelection(tag, item) {
  iphAddSelectedTag(tag);
  iphAddImage(item.url);
  iphCurrentPath = [];
}

function iphAddSelectedTag(tag) {
  iphSelectedTagGroups.push(tag);
  iphUpdateSelectedTagsDisplay();
}

function iphUpdateSelectedTagsDisplay() {
  const selectedTagsElement = document.getElementById('iph-selected-tags');
  selectedTagsElement.innerHTML = '';
  iphSelectedTagGroups.forEach((tag, index) => {
    const groupElement = document.createElement('span');
    groupElement.classList.add('iph-selected-tag-group');
    groupElement.textContent = tag;
    groupElement.addEventListener('click', () => iphRemoveTagGroup(index));
    const removeButton = document.createElement('span');
    removeButton.classList.add('iph-remove-tag');
    removeButton.innerHTML = '<i class="fas fa-times"></i>';
    removeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      iphRemoveTagGroup(index);
    });
    groupElement.appendChild(removeButton);
    selectedTagsElement.appendChild(groupElement);
  });

  const downloadButton = document.getElementById('iph-download-button');
  const copyButton = document.getElementById('iph-copy-button');
  const hasSelectedTags = iphSelectedTagGroups.length > 0;
  downloadButton.disabled = !hasSelectedTags;
  copyButton.disabled = !hasSelectedTags;
}

function iphRemoveTagGroup(index) {
  iphSelectedTagGroups.splice(index, 1);
  iphSelectedImages.splice(index, 1);
  const imageWrapper = iphImageWrappers[index];
  if (imageWrapper) {
    imageWrapper.remove();
    iphImageWrappers.splice(index, 1);
    iphUpdateImageIndices();
  }
  iphUpdateSelectedTagsDisplay();
}

function iphUpdateImageIndices() {
  iphImageWrappers.forEach((wrapper, index) => {
    const removeButton = wrapper.querySelector('.iph-remove-tag');
    removeButton.onclick = (e) => {
      e.stopPropagation();
      iphRemoveTagGroup(index);
    };
    wrapper.querySelector('img').onclick = () => iphRemoveTagGroup(index);
  });
}

function iphAddImage(url) {
  if (url) {
    iphSelectedImages.push(url);
    const imageContainer = document.getElementById('iph-image-container');
    const index = iphSelectedImages.length - 1;

    iphLoadImage(url).then(img => {
      const wrapper = iphCreateImageWrapper(url, index);
      imageContainer.appendChild(wrapper);
      iphImageWrappers.push(wrapper);
      iphUpdateImageIndices();
    });
  }
}

function iphCreateImageWrapper(url, index) {
  const imageWrapper = document.createElement('div');
  imageWrapper.classList.add('iph-image-container');

  const imgElement = document.createElement('img');
  imgElement.src = url;

  const removeButton = document.createElement('span');
  removeButton.classList.add('iph-remove-tag');
  removeButton.innerHTML = '<i class="fas fa-times"></i>';

  imageWrapper.appendChild(imgElement);
  imageWrapper.appendChild(removeButton);
  return imageWrapper;
}

function iphUpdateImageDisplay() {
  const imageContainer = document.getElementById('iph-image-container');
  imageContainer.innerHTML = '';
  iphImageWrappers = [];

  iphSelectedImages.forEach((url, index) => {
    iphLoadImage(url).then(img => {
      const wrapper = iphCreateImageWrapper(url, index);
      imageContainer.appendChild(wrapper);
      iphImageWrappers.push(wrapper);
    });
  });
}

function iphRemoveCustomSetItem(itemName) {
  console.log("iphRemoveCustomSetItem", "1");
  let customSet = JSON.parse(localStorage.getItem('CustomSet') || '{"Custom Set":{}}');
  console.log("iphRemoveCustomSetItem", "2");

  if (customSet['Custom Set'] && customSet['Custom Set'][itemName]) {
    console.log("iphRemoveCustomSetItem", "3");
    delete customSet['Custom Set'][itemName];
    console.log("iphRemoveCustomSetItem", "4");
    localStorage.setItem('CustomSet', JSON.stringify(customSet));
    console.log("iphRemoveCustomSetItem", "5");
    
    // データの再読み込みと UI の更新
    console.log("iphRemoveCustomSetItem", "6");
    iphLoadLocalStorage().then(() => {
      console.log("iphRemoveCustomSetItem", "7");
      iphRefreshUI();  // 全体のUIを更新
      console.log("iphRemoveCustomSetItem", "8");
      if (iphCurrentPath[0] === 'Custom Set') {
        console.log("iphRemoveCustomSetItem", "9");
        iphShowTags(iphData['Custom Set'], iphCurrentPath.length - 1);
        console.log("iphRemoveCustomSetItem", "10");
      }
    });
  }
}