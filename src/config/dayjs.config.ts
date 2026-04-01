import dayjs from "dayjs";
import weekday from "dayjs/plugin/weekday";
import localeData from "dayjs/plugin/localeData";
import customParseFormat from 'dayjs/plugin/customParseFormat'
import "dayjs/locale/fr";

// Configure Day.js plugins for Ant Design DatePicker compatibility
dayjs.extend(weekday);
dayjs.extend(localeData);
dayjs.extend(customParseFormat);
dayjs.locale("fr");

export default dayjs;
