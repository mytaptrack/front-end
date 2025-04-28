import { Injectable } from '@angular/core';
import { moment, Moment } from '../types';

export enum ReportDuration {
    week = 'week',
    month = 'month',
    year = 'year',
    range = 'range'
}

@Injectable({
    providedIn: 'root'
})
export class DateTimeService {
    constructor() { }

    private static toUtc(friendlyTimestamp: string, dateMissingFromTimestamp: Date) {
        try {
            const splitTime = friendlyTimestamp.split(':');
            let hours = parseInt(splitTime[0], 10);
            const minutes = parseInt(splitTime[1], 10);
            const seconds = parseInt(splitTime[2].split(' ')[0], 10);
            const isPm = friendlyTimestamp.toLowerCase().endsWith('pm');

            if (isPm) {
                hours += 12;
            }

            const utc = new Date(dateMissingFromTimestamp.getTime());
            utc.setHours(hours, minutes, seconds);
            return utc.toISOString();
        } catch {
            return friendlyTimestamp;
        }
    }

    private static fromUtc(dateToken: string) {
        console.log(`fromUtc`);
        try {
            console.log(`try`);
            const date = new Date(dateToken);
            console.log(`date: ${date}`);

            let hours = date.getHours();
            let amPm = 'am';
            if (hours > 11) {
                amPm = 'pm';
            }
            if (hours > 12) {
                hours -= 12;
            } else if (hours === 0) {
                hours = 12;
            }
            console.log(`hours: ${hours}`);
            console.log(`date.getMinutes(): ${date.getMinutes()}`);
            console.log(`date.getSeconds(): ${date.getSeconds()}`);
            console.log(`amPm: ${amPm}`);

            console.log(`${this.getTwoDigits(hours)}`);
            console.log(`${this.getTwoDigits(date.getMinutes())}`);
            console.log(`${this.getTwoDigits(date.getSeconds())}`);

            // tslint:disable-next-line:max-line-length
            const friendlyTimestamp = `${DateTimeService.getTwoDigits(hours)}:${DateTimeService.getTwoDigits(date.getMinutes())}:${DateTimeService.getTwoDigits(date.getSeconds())} ${amPm}`;
            console.log(`friendlyTimestamp: ${friendlyTimestamp}`);
            return friendlyTimestamp;
        } catch (err) {
            console.log(`catch: ${err}`);
            return dateToken;
        }
    }

    private static getTwoDigits(val: number) {
        return val.toString().padStart(2, '0');
    }


    getReadableTime(dateTimeString: string | number, endAtMinutes) {
        if (!dateTimeString) {
            return '';
        }
        if (typeof dateTimeString == 'string' && dateTimeString.length < 10) {
            return dateTimeString;
        }
        let date = moment(dateTimeString);

        if (endAtMinutes) {
            date = date.startOf('minute');
        }

        return date.format('hh:mm:ss A');
    }

    parseHours(timeString) {
        if (!timeString) {
            return null;
        }

        const colinIndex = timeString.indexOf(':');
        let amPmIndex = timeString.toLowerCase().indexOf('am');
        if (amPmIndex == -1) {
            amPmIndex = timeString.toLowerCase().indexOf('pm');
        }

        let hoursString = '0';
        let hours: number;
        let minutes = 0;
        const amPm = (amPmIndex != -1) ? timeString.substr(amPmIndex, 2) : null;
        if (colinIndex > 0) {
            let parts = timeString.split(':');
            if (!parts[0].match(/[0-9]+/)) {
                return null;
            }
            hoursString = parts[0];
            if (parts[1].length > 0) {
                parts = parts[1].split(' ');
                minutes = parseInt(parts[0]);
            }
        } else {
            let parts = timeString.split(' ');
            if (!parts[0].match(/[0-9]+/)) {
                return null;
            }
            hoursString = parts[0];
        }

        hoursString = hoursString.trim();
        if (hoursString.length == 3 || hoursString.length == 4) {
            minutes = parseInt(hoursString.substr(hoursString.length - 2, 2));
            hoursString = hoursString.substr(0, hoursString.length - 2);
        }
        hours = parseInt(hoursString);

        if (isNaN(hours) || isNaN(minutes)) {
            return null;
        }

        if (hours == 0) {
            hours = 12;
        }

        return {
            hours: hours,
            minutes: minutes,
            amPm: amPm
        };
    }

    isTime(time: string): boolean {
        if (!time) {
            return false;
        }

        return time.match(/\d:\d\d\W*(am|pm)/) != null;
    }

    evaluateUserTime(timeString: string, notBeforeString?: string): string {
        if (!timeString) {
            return timeString;
        }

        let time = this.parseHours(timeString);
        if (!time) {
            return timeString;
        }
        let notBeforeTime = this.parseHours(notBeforeString);

        let retval = time.hours + ':';
        if (time.minutes < 10) {
            retval += '0';
        }
        retval += time.minutes;

        if (time.amPm) {
            retval += ' ' + time.amPm;
        } else {
            retval += ' ';
            let guess = (time.hours < 6) ? 'pm' : 'am';
            if (time.hours == 12) {
                guess = 'pm';
            }
            if (notBeforeTime) {
                if (time.hours < notBeforeTime.hours ||
                    notBeforeTime.amPm == 'pm') {
                    guess = 'pm';
                }
            }
            retval += guess;
        }

        return retval;
    }

    parseHoursMinutes(time: string | Moment, relatedTimezone?: string, fromDate?: Moment): Moment {
        if (typeof(time) !== 'string') {
            return time as Moment;
        }
        if (typeof time === 'string' &&
            /\d{4}-\d+-\d+T\d+:\d+:\d+.\d+Z/.test(time)) {
            return moment(time);
        }

        const fromDateValue = (fromDate) ? fromDate : moment();

        let timeString = (time as string).trim();
        let highParts = timeString.split(' ');
        if (highParts.length != 2) {
            return null;
        }
        let amPm = highParts[highParts.length - 1];
        let lowParts = highParts[0].split(':');
        if (lowParts.length != 2 && lowParts.length != 3) {
            return null;
        }
        let hours = parseInt(lowParts[0]);
        let minutes = parseInt(lowParts[1]);
        let seconds = 0;

        if(lowParts.length == 3) {
            seconds = parseInt(lowParts[2]);
        }

        if (hours > 12 || hours < 0 || isNaN(hours) || isNaN(minutes)) {
            return null;
        }

        if (amPm.toLowerCase() == 'pm' && hours != 12) {
            hours += 12;
        }
        if (amPm.toLowerCase() == 'am' && hours == 12) {
            hours = 0;
        }

        let date = fromDateValue.clone().local().startOf('day');
        date.hours(hours);
        date.minutes(minutes);
        date.seconds(seconds);
        return date;
    }

    calculateDuration(startTime: Date, endTime: Date): string {
        const diff = endTime.getTime() - startTime.getTime();
        const seconds = Math.floor(diff / 1000) % 60;
        const minutes = Math.floor(diff / 1000 / 60) % 60;
        const hours = Math.floor(diff / 1000 / 60 / 60);
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    public getDayDiff(date1: Date, date2: Date): number {
        if(!date2) {
            return -1;
        }
        return Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
    }
    public weekStartToDate(weekStart: string): Date {
        const dateParts = weekStart.split('/');
        return new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    }

    public getWeekStart(date: Moment): Moment {
        return date.clone().startOf('week');
    }

    public getReadableDate(date: Moment): string {
        return date.format('MM/DD/yyyy');
    }

    public findAndConvertToUtc(textWithFriendlyTimes: string, dateMissingFromTimestamp: Date): string {
        try {
            const parseForFriendlyTimestamp = /(\[)((?:\d\d:){2}(?:\d\d) (?:am|pm))(\])/gi; // [03:24:51 pm]

            const utc = textWithFriendlyTimes.replace(parseForFriendlyTimestamp, (_, leftBracket, timestamp, rightBracket) => {
                return `${leftBracket}${DateTimeService.toUtc(timestamp, dateMissingFromTimestamp)}${rightBracket}`;
            } );
            return utc;
        } catch {
            return textWithFriendlyTimes;
        }
    }

    public findAndConvertFromUtc(textWithUtcTimes: string): string {
        try {
            // Not-so Flexible ISO grabber.
            // If JavaScript ever starts to encode date.toISOString() with area code info rather than
            // always converting to UTC (Z) the regex will break.
            const parseForDateToken = /(\[)(\d{4}(?:-\d\d){2}T(?:\d\d:){2}\d\d\.\d{3}Z)(\])/gi;  // [2019-07-18T15:24:51.000Z]
            const local = textWithUtcTimes.replace(parseForDateToken, (_, leftBracket, dateToken, rightBracket) => {
                return `${leftBracket}${DateTimeService.fromUtc(dateToken)}${rightBracket}`;
            } );
            return local;
        } catch {
            return textWithUtcTimes;
        }

    }


}
