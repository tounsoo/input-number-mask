import '@testing-library/jest-dom';

// Polyfill innerText for jsdom
Object.defineProperty(HTMLElement.prototype, 'innerText', {
    get() {
        return this.textContent;
    },
    set(value) {
        this.textContent = value;
    },
    configurable: true,
});
