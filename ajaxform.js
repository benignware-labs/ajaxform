import uniqueSelector from 'unique-selector';
import qs from 'qs';
import getFormData from 'get-form-data';

// Find the closest matching ancestor
const closest = (el, selector) => {
  // Detect vendor name
  const matches = ['webkit', 'ms'].map(prefix => prefix + 'Matches').find(name => el[name]) || 'matches';

  // Traverse dom to find the closest element
  while (el.parentElement) {
    if (typeof selector === 'string' && el[matches](selector) || selector instanceof window.HTMLElement && el === selector ) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
};

const createSubmitHandler = (selector, options) => event => {
  const formElement = event.target;
  const formData = getFormData(formElement);
  const targetElement = closest(event.target, selector);
  const url = formElement.getAttribute('action') || '.';

  let { request } = options;

  request.method = (formElement.getAttribute('method') || request.method).toUpperCase();
  request.headers = Object.assign({}, request.method === 'POST' && {
    'X-Ajaxform': '*',
    'Accept': 'application/json, application/xml, text/plain, text/html, *.*',
    'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
  }, request.headers);

  if (request.method === 'POST') {
    request.body = qs.stringify(formData);
  }
  // TODO: For get requests, merge url with query params
  if (targetElement) {
    const remoteSelector = options.remoteSelector || uniqueSelector(targetElement);

    fetch(url, request).then(response => {
      response.text().then(html => {
        // Parse html
        const dom = document.createElement( 'div' );
        dom.innerHTML = html;

        // Find element
        const remoteElement = dom.querySelector(remoteSelector);

        if (remoteElement) {
          // Remove attributes
          for (let { name } of dom.attributes) {
            targetElement.removeAttribute(name);
          }
          // Update attributes
          for (let { name, value } of remoteElement.attributes) {
            targetElement.setAttribute(name, value);
          }
          // Update content
          targetElement.innerHTML = remoteElement.innerHTML;
        }
      });
    });
    event.preventDefault();
  }
};

function ajaxform(selector = 'form', options = {}) {
  options = Object.assign({
    responseSelector: '',
    request: Object.assign({
      // Options passed to fetch
    }, options.request)
  }, options);
  const handleSubmit = createSubmitHandler(selector, options);
  document.addEventListener('submit', handleSubmit);

  return {
    destroy() {
      window.removeEventListener('submit', handleSubmit);
    }
  };
}

// Pollute the global namespace
if (typeof window !== 'undefined') {
  window.ajaxform = ajaxform;
}

export default ajaxform;
