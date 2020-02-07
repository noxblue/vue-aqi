//建立option的選項元件，帶入變數為county，使用x-template文件id="optionsTemplate"渲染
Vue.component('location-options', {
    props: ['county'],
    template: '#optionsTemplate',
    data: function () {
        return {
            selected: ''
        }
    },
    methods: {
        changeSelect: function () {
            this.$emit('changed', this.selected)
        },
    },
});

//建立card元件，帶入變數為siteData，使用x-template文件id="infoCard"渲染
Vue.component('aqi-card', {
    props: ['sitedata'],
    template: '#infoCard',
    methods: {
        clickLikeBtn: function () {
            this.$emit('like', this.sitedata.SiteId)
        },
        statusCheck(status) {
            switch (status) {
                case '良好':
                    return '';
                    break;
                case '普通':
                    return 'status-aqi2';
                    break;
                case '對敏感族群不健康':
                    return 'status-aqi3';
                    break;
                case '對所有族群不健康':
                    return 'status-aqi4';
                    break;
                case '非常不健康':
                    return 'status-aqi5';
                    break;
                case '危害':
                    return 'status-aqi6';
                    break;
                default:
                    break;
            }
        },
    },
});

// API 來源
// https://opendata.epa.gov.tw/Data/Contents/AQI/
var app = new Vue({
    el: '#app',
    data: {
        //儲存取得的所有資料
        data: [],
        //儲存selected選項
        location: [],
        //儲存被加入最愛的項目，為空陣列，或，從localStorage的starSite中取出來轉為Array的陣列
        stared: JSON.parse(localStorage.getItem('starSite')) || [],
        //儲存select選取的城市(名稱為filter時可能造成js取資料時誤解為filter篩選方法，故修改為filterLocation)
        filterLocation: '',
    },
    // 請在此撰寫 JavaScript
    methods: {
        //使用ajax取得資料
        getData() {
            const vm = this;
            // const api = 'http://opendata2.epa.gov.tw/AQI.json';
            const api = 'https://opendata.epa.gov.tw/api/v1/AQI?%24skip=0&%24top=1000&%24format=json'
            // 使用 jQuery ajax
            $.get(api).then(function (response) {
                vm.data = response;

                //為每個項目附加物件參數isLike，預設值為false，作為判斷呈現加入最愛的項目
                for (let i = 0; i < vm.data.length; i++) {
                    // vm.data[i].isLike = false
                    //透過Vue.set為物件加上屬性值，該屬性才能進行同步渲染：Vue.set(目標物件,'屬性名稱',值)；Vue.set(目標陣列,位置,值or物件)
                    Vue.set(vm.data[i], 'isLike', false)
                }

                //從stared的陣列中與資料data進行比較，相符時將該筆資料isLike轉為true(將localStorage資料取出存入stared，進行比較後重新變更資料isLike值)
                vm.data.forEach(function (value) {
                    if (vm.stared.indexOf(value.SiteId) > -1) { value.isLike = true }
                })
                // //檢查取得並更新的資料
                // console.log(vm.data)

                //透過變數county儲存所有data資料中的County
                let county = []
                for (let i = 0; i < vm.data.length; i++) {
                    county.push(vm.data[i].County)
                }
                //將county陣列值與location陣列透過forEach進行indexOf比對，無相同值回應-1，存入location
                county.forEach(function (value) {
                    if (vm.location.indexOf(value) == -1) {
                        vm.location.push(value)
                    }
                })
                // //檢查取得County名單
                // console.log(vm.location)

            });

        },

        //透過內部元件觸發此事件，將傳出來的選取值selected以參數value帶入此function
        changeSelectValue: function (value) {
            //使app中filterLocation值等於傳入參數(即元件中選取值)
            this.filterLocation = value;
        },
        //透過元件觸發至外層，傳入觸發資料的SiteId
        changeIsLike: function (id) {
            const vm = this
            //透過forEach比對SiteId找到資料並修改isLike值
            vm.data.forEach(function (item) {
                if (item.SiteId == id) {
                    let site = item.SiteId
                    item.isLike = !item.isLike
                    //當item.isLike==true時，將此SiteId存入stared陣列中(stared陣列用於儲存加入關注的地區id)
                    if (item.isLike) {
                        vm.stared.push(site)
                    } else {
                        //當item.isLike==false時，透過forEach找尋stared陣列中與site相同的資料位置index
                        vm.stared.forEach(function (value, index) {
                            //當indexOf==0，即資料相同，則刪除陣列中該筆資料index的資料
                            if (site.indexOf(value) == 0) {
                                vm.stared.splice(index, 1)
                            }
                        })
                    }
                    //將stared資料轉為string存入localstorage中
                    localStorage.setItem('starSite', JSON.stringify(vm.stared));
                }
            })
        },

    },
    //在建立app階段執行methods的getData，透過ajax取得
    created: function () {
        this.getData();
    },

    computed: {
        filterUnlikeCounty: function () {
            const vm = this
            //當filterLocation為空值(即未使用select進行選擇)，回傳整份資料
            if (vm.filterLocation == '') {
                //原return vm.data，加入filter方法找出未關注(vm.data[item].isLike==false)的項目進行return
                return vm.data.filter(function (item) {
                    // return後方設定條件，符合條件者會return整個item
                    return item.isLike == false
                })
            } else {
                //當filterLocation有值，則透過filter方法，將整份資料傳入
                return vm.data.filter(function (item) {
                    //從每個資料(item)中的County值與filterLocation值進行比對，相符時return該份資料做為顯示
                    //另外使用&&條件加上未關注者，找出該地區未被關注項目
                    return item.County.match(vm.filterLocation) && item.isLike == false
                })
            }
        },
        filterIslikeCountry: function () {
            const vm = this
            // //關注的不需要進行城市篩選(不管選擇在哪個城市，關注的城鎮都應該在上方)
            // if (vm.filterLocation == ''){
            //   return vm.data.filter(function(item){
            //     return item.isLike == true
            //   })
            // }else{
            //   return vm.data.filter(function(item){
            //     return item.County.match(vm.filterLocation) && item.isLike == true
            //   })
            // }
            return vm.data.filter(function (item) {
                return item.isLike == true;
            });
        }
    },
});