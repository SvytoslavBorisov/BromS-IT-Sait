import styles from "../app/main/page.module.css";


export function initCarousel(root: HTMLElement) {
  const cards = root.querySelector<HTMLElement>(`.${styles.cards}`)!;
  const prev  = root.querySelector<HTMLElement>(`.${styles.arrowPrev}`)!;
  const next  = root.querySelector<HTMLElement>(`.${styles.arrowNext}`)!;
  const dots  = Array.from(
    root.querySelectorAll<HTMLElement>(`.${styles.dot}`)
  );
  let index = 0, total = dots.length;
  alert(cards);

  const update = () => {
    const cardWidth = cards.clientWidth / 3 + 16;  // подгоните под свой gap
    cards.style.transform = `translateX(-${cardWidth * index}px)`;
    dots.forEach((d,i) => d.classList.toggle("active", i === index));
  };

  prev.addEventListener("click", () => {
    index = index > 0 ? index - 1 : total - 1;
    update();
  });
  next.addEventListener("click", () => {
    index = (index + 1) % total;
    update();
  });

  // сразу отрисуем стартовую позицию
  update();
}
