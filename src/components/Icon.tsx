import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faMoon } from "@fortawesome/free-regular-svg-icons";
import {
  faArrowRightLong,
  faBan,
  faBed,
  faBolt,
  faBook,
  faBuilding,
  faBullhorn,
  faBullseye,
  faCalendarDays,
  faChartLine,
  faChevronDown,
  faCircle,
  faCircleCheck,
  faCircleInfo,
  faCircleQuestion,
  faCircleXmark,
  faClipboardList,
  faCloudBolt,
  faCloudSunRain,
  faCompass,
  faEnvelope,
  faFish,
  faFishFins,
  faHouse,
  faLocationCrosshairs,
  faLocationDot,
  faMagnifyingGlass,
  faMap,
  faPhone,
  faStar,
  faStopwatch,
  faSun,
  faTriangleExclamation,
  faWater,
  faWrench,
} from "@fortawesome/free-solid-svg-icons";

const ICONS = {
  moon: faMoon,
  sun: faSun,
  fish: faFish,
  fishFins: faFishFins,
  sleep: faBed,
  home: faHouse,
  weather: faCloudSunRain,
  compass: faCompass,
  clipboard: faClipboardList,
  target: faBullseye,
  warning: faTriangleExclamation,
  storm: faCloudBolt,
  chart: faChartLine,
  alert: faBullhorn,
  info: faCircleInfo,
  bolt: faBolt,
  building: faBuilding,
  caret: faChevronDown,
  mapPin: faLocationDot,
  map: faMap,
  phone: faPhone,
  envelope: faEnvelope,
  stopwatch: faStopwatch,
  calendar: faCalendarDays,
  arrowRight: faArrowRightLong,
  wrench: faWrench,
  water: faWater,
  check: faCircleCheck,
  ban: faBan,
  xmark: faCircleXmark,
  question: faCircleQuestion,
  star: faStar,
  bullet: faCircle,
  search: faMagnifyingGlass,
  locationTarget: faLocationCrosshairs,
  book: faBook,
} satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  className?: string;
  title?: string;
  ariaLabel?: string;
}

export default function Icon({
  name,
  className,
  title,
  ariaLabel,
}: IconProps) {
  const icon = ICONS[name] ?? ICONS.fish;

  return (
    <FontAwesomeIcon
      icon={icon}
      className={className}
      title={title}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      role={ariaLabel ? "img" : undefined}
    />
  );
}

