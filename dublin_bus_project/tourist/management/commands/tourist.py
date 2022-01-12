import json
import time

import requests
from django.core.management import BaseCommand

from tourist.models import TouristInfoPlaces, TouristInfoTag, TouristInfoGroup


class Command(BaseCommand):
    help = 'Gets Fáilte Ireland tourist information'

    def handle(self, *args, **kwargs):
        # scrape activities, attractions, and accommodations for Dublin
        # has to run from time to time

        def save(results, group_name):
            # save results to database
            for entry in results:
                if 'geo' in entry:
                    info = TouristInfoPlaces(name=entry['name'],
                                             url=entry['url'],
                                             longitude=entry['geo']['longitude'],
                                             latitude=entry['geo']['latitude'],
                                             telephone=entry['telephone'],
                                             address=entry['address']['addressLocality'],
                                             image=entry['image']['url'],
                                             info_type=entry['@type'],
                                             group_name=group_name)
                    info.save()
                    # add group
                    group, created = TouristInfoGroup.objects.get_or_create(name=group_name)

                    # add tags
                    for tag_name in entry['tags']:
                        tag, created = TouristInfoTag.objects.get_or_create(name=tag_name)
                        info.tags.add(tag)
                        group.tags.add(tag)

                    info.save()
                    group.save()

        # remove all data
        TouristInfoPlaces.objects.all().delete()
        TouristInfoTag.objects.all().delete()
        TouristInfoGroup.objects.all().delete()

        print('fetching data')

        # get activities, attractions, and accommodations for Dublin
        routes = ['activities', 'attractions', 'accommodation']
        for route in routes:
            print('getting ' + route)
            url = 'https://failteireland.azure-api.net/opendata-api/v1/' + route + '?search=Dublin'
            print(url)
            response = requests.get(url)
            data = json.loads(response.text)
            save(data['results'], route)
            # count requests
            count = 1

            while 'nextPage' in data:
                # avoid the rate limit error
                if count == 10:
                    count = 0
                    print('waiting 14 seconds')
                    time.sleep(14)

                print(data['nextPage'])
                response = requests.get(data['nextPage'])
                data = json.loads(response.text)
                save(data['results'], route)

                count += 1
                # wait 1 second
                time.sleep(1)

        print('finished')
