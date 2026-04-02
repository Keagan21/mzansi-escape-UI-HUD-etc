export async function typeText(element, text, speed = 18, onSkip = null) {
  element.textContent = '';

  for (let index = 0; index < text.length; index += 1) {
    if (onSkip?.()) {
      element.textContent = text;
      return;
    }

    element.textContent += text[index];
    await new Promise((resolve) => setTimeout(resolve, speed));
  }
}
